import { db } from '@vercel/postgres';
import type { Feature, MultiPolygon, FeatureCollection } from 'geojson';

// ============================================================================
// Types
// ============================================================================

export type ConfidenceTier = 'verified' | 'probable' | 'possible' | 'anomaly';

export interface Detection {
  id: string;
  source: string;
  source_record_id: string;
  acquisition_id: string;
  detected_at: string;
  ingested_at: string;
  area_km2: number;
  confidence: number;
  confidence_tier: ConfidenceTier;
  pollutant_type: string;
  provenance: string;
  thumbnail_url: string | null;
  raw_record_url: string | null;
  model_version: string | null;
  metadata: Record<string, unknown>;
  is_fresh: boolean;
  is_experimental: boolean;
}

export type DetectionFeature = Feature<MultiPolygon, Detection>;
export type DetectionFeatureCollection = FeatureCollection<MultiPolygon, Detection>;

// ============================================================================
// Confidence tier helpers
// ============================================================================

export const CONFIDENCE_THRESHOLDS: Record<ConfidenceTier, number> = {
  verified: 0.85,
  probable: 0.6,
  possible: 0.3,
  anomaly: 0,
};

/**
 * Assigns a confidence_tier from a numeric score [0,1].
 * heuristic-v0 provenance is always capped at 'anomaly'.
 */
export function assignConfidenceTier(confidence: number, provenance: string): ConfidenceTier {
  if (provenance === 'heuristic-v0') return 'anomaly';
  if (confidence >= CONFIDENCE_THRESHOLDS.verified) return 'verified';
  if (confidence >= CONFIDENCE_THRESHOLDS.probable) return 'probable';
  if (confidence >= CONFIDENCE_THRESHOLDS.possible) return 'possible';
  return 'anomaly';
}

/** Returns true if the detection is less than 24 hours old. */
export function isFresh(detectedAt: string | Date): boolean {
  const ts = typeof detectedAt === 'string' ? new Date(detectedAt).getTime() : detectedAt.getTime();
  return Date.now() - ts < 24 * 60 * 60 * 1000;
}

/** Returns true if this detection was produced by an unvalidated heuristic. */
export function isExperimental(provenance: string): boolean {
  return provenance === 'heuristic-v0';
}

// ============================================================================
// Query parameters
// ============================================================================

export interface DetectionsQueryParams {
  bbox?: [number, number, number, number];
  start?: Date;
  end?: Date;
  minConfidence?: number;
  tier?: ConfidenceTier;
  limit?: number;
  offset?: number;
}

const MAX_LIMIT = 1000;

// SELECT clause shared across all query variants
const DETECTION_SELECT = `
  SELECT
    id::text,
    source,
    source_record_id,
    acquisition_id,
    (detected_at AT TIME ZONE 'UTC')::text  AS detected_at,
    (ingested_at AT TIME ZONE 'UTC')::text  AS ingested_at,
    ST_AsGeoJSON(geometry)::json            AS geometry,
    area_km2::float,
    confidence::float,
    confidence_tier,
    pollutant_type,
    provenance,
    thumbnail_url,
    raw_record_url,
    model_version,
    metadata
  FROM detections
`;

function rowToFeature(row: Record<string, unknown>): DetectionFeature {
  const detectedAt = row['detected_at'] as string;
  const provenance = row['provenance'] as string;
  return {
    type: 'Feature',
    geometry: row['geometry'] as MultiPolygon,
    properties: {
      id: row['id'] as string,
      source: row['source'] as string,
      source_record_id: row['source_record_id'] as string,
      acquisition_id: row['acquisition_id'] as string,
      detected_at: detectedAt,
      ingested_at: row['ingested_at'] as string,
      area_km2: Number(row['area_km2']),
      confidence: Number(row['confidence']),
      confidence_tier: row['confidence_tier'] as ConfidenceTier,
      pollutant_type: row['pollutant_type'] as string,
      provenance,
      thumbnail_url: (row['thumbnail_url'] as string | null) ?? null,
      raw_record_url: (row['raw_record_url'] as string | null) ?? null,
      model_version: (row['model_version'] as string | null) ?? null,
      metadata: (row['metadata'] as Record<string, unknown>) ?? {},
      is_fresh: isFresh(detectedAt),
      is_experimental: isExperimental(provenance),
    },
  };
}

/**
 * Queries detections with optional spatial/temporal/confidence filters.
 * Uses parameterized raw SQL to support dynamic WHERE clauses safely.
 */
export async function queryDetections(
  params: DetectionsQueryParams = {}
): Promise<DetectionFeatureCollection> {
  const {
    bbox,
    start,
    end = new Date(),
    minConfidence = 0,
    tier,
    limit = 200,
    offset = 0,
  } = params;

  const clampedLimit = Math.min(limit, MAX_LIMIT);
  const startFallback = start ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Build WHERE clauses and parameter array dynamically
  const conditions: string[] = [];
  const values: unknown[] = [];
  let p = 1; // parameter counter

  conditions.push(`detected_at BETWEEN $${p++}::timestamptz AND $${p++}::timestamptz`);
  values.push(startFallback.toISOString(), end.toISOString());

  conditions.push(`confidence >= $${p++}`);
  values.push(minConfidence);

  if (tier !== undefined) {
    conditions.push(`confidence_tier = $${p++}`);
    values.push(tier);
  }

  if (bbox !== undefined) {
    conditions.push(`geometry && ST_MakeEnvelope($${p++}, $${p++}, $${p++}, $${p++}, 4326)`);
    values.push(bbox[0], bbox[1], bbox[2], bbox[3]);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  values.push(clampedLimit);
  const limitParam = p++;
  values.push(offset);
  const offsetParam = p++;

  const queryText = `
    ${DETECTION_SELECT}
    ${whereClause}
    ORDER BY detected_at DESC
    LIMIT $${limitParam}
    OFFSET $${offsetParam}
  `;

  const { rows } = await db.query(queryText, values as string[]);

  return {
    type: 'FeatureCollection',
    features: rows.map((row) => rowToFeature(row as Record<string, unknown>)),
  };
}

/**
 * Fetches a single detection by ID.
 */
export async function getDetectionById(id: string): Promise<DetectionFeature | null> {
  const { rows } = await db.query(`${DETECTION_SELECT} WHERE id = $1 LIMIT 1`, [id]);
  const row = rows[0];
  if (!row) return null;
  return rowToFeature(row as Record<string, unknown>);
}
