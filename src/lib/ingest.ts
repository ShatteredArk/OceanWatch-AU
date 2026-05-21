/**
 * Ingest pipeline: fetches detections from upstream Copernicus sources and
 * upserts them into the database with idempotent semantics.
 *
 * Pipeline order:
 *   1. CMEMS REST API — derived oil-slick products (preferred; pre-validated)
 *   2. CDSE OData Sentinel-1 GRD — heuristic fallback (tagged accordingly)
 */

import { db } from '@vercel/postgres';
import {
  fetchCmemsOilSlickProducts,
  fetchCdseProducts,
  extractQuicklookUrl,
  type CdseProduct,
} from './copernicus';
import { assignConfidenceTier, type ConfidenceTier } from './detections';
import { logger } from './logger';

// ============================================================================
// Normalised ingest record
// ============================================================================

interface IngestRecord {
  source: string;
  source_record_id: string;
  acquisition_id: string;
  detected_at: Date;
  geometry_wkt: string;
  confidence: number;
  confidence_tier: ConfidenceTier;
  pollutant_type: string;
  provenance: string;
  thumbnail_url: string | null;
  raw_record_url: string | null;
  model_version: string | null;
  metadata: Record<string, unknown>;
}

// ============================================================================
// CDSE → IngestRecord normalisation
// ============================================================================

/**
 * Converts a raw CDSE OData product into an IngestRecord.
 * Uses the acquisition footprint as the geometry and tags as heuristic-v0.
 */
function normaliseCdseProduct(product: CdseProduct): IngestRecord | null {
  if (!product.Footprint) {
    logger.warn('CDSE product missing footprint, skipping', { id: product.Id });
    return null;
  }

  // Normalise WKT: CDSE may return POLYGON; wrap in MULTIPOLYGON for schema compatibility
  let geometryWkt = product.Footprint.trim();
  if (geometryWkt.toUpperCase().startsWith('POLYGON')) {
    const coords = geometryWkt.slice(geometryWkt.indexOf('('));
    geometryWkt = `MULTIPOLYGON(${coords})`;
  }

  const detectedAt = product.ContentDate?.Start ? new Date(product.ContentDate.Start) : new Date();
  const thumbnailUrl = extractQuicklookUrl(product);

  return {
    source: 'copernicus-cdse',
    source_record_id: product.Id,
    acquisition_id: product.Name ?? product.Id,
    detected_at: detectedAt,
    geometry_wkt: geometryWkt,
    confidence: 0.1,
    confidence_tier: assignConfidenceTier(0.1, 'heuristic-v0'),
    pollutant_type: 'oil',
    provenance: 'heuristic-v0',
    thumbnail_url: thumbnailUrl,
    raw_record_url: `https://catalogue.dataspace.copernicus.eu/odata/v1/Products(${product.Id})`,
    model_version: 'heuristic-v0',
    metadata: {
      product_type: product.ProductType,
      cdse_id: product.Id,
      name: product.Name,
    },
  };
}

// ============================================================================
// Upsert — parameterized raw SQL for clarity and safety
// ============================================================================

async function upsertDetection(record: IngestRecord): Promise<void> {
  await db.query(
    `INSERT INTO detections (
      source, source_record_id, acquisition_id, detected_at,
      geometry, area_km2, confidence, confidence_tier,
      pollutant_type, provenance, thumbnail_url, raw_record_url,
      model_version, metadata
    ) VALUES (
      $1, $2, $3, $4::timestamptz,
      ST_GeomFromText($5, 4326),
      ROUND(
        (ST_Area(ST_GeomFromText($5, 4326)::geography) / 1e6)::numeric,
        2
      ),
      $6, $7, $8, $9, $10, $11, $12,
      $13::jsonb
    )
    ON CONFLICT (source, source_record_id) DO UPDATE SET
      thumbnail_url = EXCLUDED.thumbnail_url,
      ingested_at   = now(),
      metadata      = EXCLUDED.metadata`,
    [
      record.source,
      record.source_record_id,
      record.acquisition_id,
      record.detected_at.toISOString(),
      record.geometry_wkt,
      record.confidence,
      record.confidence_tier,
      record.pollutant_type,
      record.provenance,
      record.thumbnail_url,
      record.raw_record_url,
      record.model_version,
      JSON.stringify(record.metadata),
    ]
  );
}

// ============================================================================
// Main ingest function
// ============================================================================

export interface IngestResult {
  attempted: number;
  upserted: number;
  errors: number;
  sources: string[];
}

export async function runIngest(opts: {
  lookbackDays?: number;
  maxResultsPerSource?: number;
}): Promise<IngestResult> {
  const { lookbackDays = 7, maxResultsPerSource = 50 } = opts;

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

  const records: IngestRecord[] = [];
  const sources: string[] = [];

  // Step 1: CMEMS derived products (best-effort)
  try {
    const cmems = await fetchCmemsOilSlickProducts({ startDate, endDate });
    if (cmems.length > 0) {
      sources.push('cmems');
      logger.info('CMEMS returned derived products', { count: cmems.length });
    } else {
      logger.info('CMEMS returned no products — falling through to CDSE heuristic');
    }
  } catch (err) {
    logger.warn('CMEMS fetch failed, proceeding with CDSE only', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Step 2: CDSE Sentinel-1 GRD (heuristic fallback)
  try {
    const cdseProducts = await fetchCdseProducts({
      startDate,
      endDate,
      maxResults: maxResultsPerSource,
    });
    sources.push('cdse');

    for (const product of cdseProducts) {
      const record = normaliseCdseProduct(product);
      if (record) records.push(record);
    }

    logger.info('CDSE products normalised', { count: records.length });
  } catch (err) {
    logger.error('CDSE fetch failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Step 3: Upsert
  let upserted = 0;
  let errors = 0;

  for (const record of records) {
    try {
      await upsertDetection(record);
      upserted++;
    } catch (err) {
      errors++;
      logger.error('Failed to upsert detection', {
        source_record_id: record.source_record_id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const result: IngestResult = { attempted: records.length, upserted, errors, sources };
  logger.info('Ingest complete', result);
  return result;
}
