/**
 * Copernicus API clients.
 *
 * Two sources are attempted in order:
 *   1. CMEMS REST API — derived oil-slick products (preferred; pre-validated)
 *   2. CDSE OData/STAC — Sentinel-1 GRD acquisition metadata (heuristic fallback)
 *
 * Rate-limit notes:
 *   CDSE: ~100 req/min on free tier (undocumented; observed)
 *   CMEMS: ~10 req/min on free tier
 *
 * All tokens are cached in-memory and refreshed before expiry.
 */

import { logger } from './logger';

// ============================================================================
// Constants
// ============================================================================

const CDSE_TOKEN_URL =
  'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const CDSE_ODATA_URL = 'https://catalogue.dataspace.copernicus.eu/odata/v1';
const CDSE_STAC_URL = 'https://catalogue.dataspace.copernicus.eu/stac';

// Australian and Pacific waters bounding box (approximate)
export const AUS_PACIFIC_BBOX = {
  west: 94.0,
  south: -47.0,
  east: 169.0,
  north: -8.0,
};

// ============================================================================
// Token cache
// ============================================================================

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let cdseTokenCache: TokenCache | null = null;

async function getCdseToken(): Promise<string> {
  if (cdseTokenCache && Date.now() < cdseTokenCache.expiresAt - 60_000) {
    return cdseTokenCache.accessToken;
  }

  const clientId = process.env.CDSE_CLIENT_ID;
  const clientSecret = process.env.CDSE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('CDSE_CLIENT_ID and CDSE_CLIENT_SECRET must be set');
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(CDSE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`CDSE token request failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cdseTokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cdseTokenCache.accessToken;
}

// ============================================================================
// CDSE raw record types
// ============================================================================

export interface CdseProduct {
  Id: string;
  Name: string;
  ContentDate: { Start: string; End: string };
  Footprint: string; // WKT
  ProductType: string;
  Attributes: Array<{ Name: string; Value: string }>;
  Assets: Array<{ Type: string; Href: string }>;
  quicklook_url?: string;
}

// ============================================================================
// CDSE OData — Sentinel-1 GRD products over AUS/Pacific
// ============================================================================

/**
 * Fetches Sentinel-1 GRD products from CDSE OData for the given time window
 * and geographic bounding box.
 *
 * Returns raw product records. The caller is responsible for transforming them
 * into Detection rows.
 */
export async function fetchCdseProducts(opts: {
  startDate: Date;
  endDate: Date;
  maxResults?: number;
}): Promise<CdseProduct[]> {
  const { startDate, endDate, maxResults = 50 } = opts;
  const token = await getCdseToken();

  // Build OData filter for Sentinel-1 GRD over AUS bounding box
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();

  // Geographic filter using WKT polygon of the AUS/Pacific bbox
  const { west, south, east, north } = AUS_PACIFIC_BBOX;
  const bboxWkt = `POLYGON((${west} ${south},${east} ${south},${east} ${north},${west} ${north},${west} ${south}))`;

  const filterParts = [
    `Collection/Name eq 'SENTINEL-1'`,
    `Attributes/OData.CSC.StringAttribute/any(att:att/Name eq 'productType' and att/OData.CSC.StringAttribute/Value eq 'GRD')`,
    `ContentDate/Start ge ${startIso}`,
    `ContentDate/Start le ${endIso}`,
    `OData.CSC.Intersects(area=geography'SRID=4326;${bboxWkt}')`,
  ];

  const filter = filterParts.join(' and ');
  const url = `${CDSE_ODATA_URL}/Products?$filter=${encodeURIComponent(filter)}&$top=${maxResults}&$expand=Attributes,Assets`;

  logger.info('Fetching CDSE products', { url: url.slice(0, 200), startIso, endIso });

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error('CDSE OData request failed', {
      status: response.status,
      body: body.slice(0, 500),
    });
    throw new Error(`CDSE OData request failed: ${response.status}`);
  }

  const data = (await response.json()) as { value: CdseProduct[] };
  logger.info('CDSE products fetched', { count: data.value.length });
  return data.value;
}

/**
 * Attempts to get the quick-look thumbnail URL for a CDSE product.
 * Returns null if not available.
 */
export function extractQuicklookUrl(product: CdseProduct): string | null {
  const thumbnailAsset = product.Assets?.find(
    (a) => a.Type === 'QUICKLOOK' || a.Type === 'thumbnail'
  );
  return thumbnailAsset?.Href ?? null;
}

// ============================================================================
// CDSE STAC — alternative search interface
// ============================================================================

export interface StacItem {
  id: string;
  geometry: GeoJSON.Geometry;
  properties: {
    datetime: string;
    'sar:product_type'?: string;
    platform?: string;
    [key: string]: unknown;
  };
  links: Array<{ rel: string; href: string; type?: string }>;
  assets: Record<string, { href: string; type?: string; title?: string }>;
}

/**
 * Searches the CDSE STAC API for Sentinel-1 items.
 * Used as a fallback if OData returns unexpected results.
 */
export async function searchCdseStac(opts: {
  startDate: Date;
  endDate: Date;
  maxResults?: number;
}): Promise<StacItem[]> {
  const { startDate, endDate, maxResults = 50 } = opts;
  const token = await getCdseToken();

  const { west, south, east, north } = AUS_PACIFIC_BBOX;

  const body = {
    collections: ['SENTINEL-1'],
    datetime: `${startDate.toISOString()}/${endDate.toISOString()}`,
    bbox: [west, south, east, north],
    limit: maxResults,
    query: {
      'sar:product_type': { eq: 'GRD' },
    },
  };

  const response = await fetch(`${CDSE_STAC_URL}/search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error('CDSE STAC search failed', { status: response.status, body: text.slice(0, 500) });
    throw new Error(`CDSE STAC search failed: ${response.status}`);
  }

  const data = (await response.json()) as { features: StacItem[] };
  logger.info('CDSE STAC items fetched', { count: data.features.length });
  return data.features;
}

// ============================================================================
// CMEMS — derived oil-slick products (best effort)
// ============================================================================

/**
 * Attempts to fetch pre-processed oil-slick detections from the CMEMS
 * Marine Data Store via their OGC API / REST interface.
 *
 * CMEMS does not currently publish a ready-made oil-spill detection product
 * for the Australian/Pacific region. This function returns an empty array
 * when no product is found, triggering the CDSE heuristic fallback.
 *
 * When a CMEMS product becomes available, update this function to parse
 * its schema and return typed records.
 */
export async function fetchCmemsOilSlickProducts(opts: {
  startDate: Date;
  endDate: Date;
}): Promise<never[]> {
  const { startDate, endDate } = opts;

  logger.info('Checking CMEMS for derived oil-slick products', {
    startIso: startDate.toISOString(),
    endIso: endDate.toISOString(),
  });

  // CMEMS does not currently expose a public REST endpoint for ready-made
  // SAR oil-slick detections over AUS/Pacific with free-tier access.
  // This is a known gap documented in DECISIONS.md and docs/data-sources.md.
  // Return empty and fall through to CDSE heuristic.
  return [];
}
