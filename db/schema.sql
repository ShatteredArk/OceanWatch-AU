-- OceanWatch AU — canonical database schema
-- Apply via: pnpm db:migrate
-- Requires PostgreSQL with PostGIS extension.

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- detections
-- One row per discrete pollution detection event. Designed as the long-term
-- data contract: schema changes must be additive (never drop columns in v0).
-- ============================================================================
CREATE TABLE IF NOT EXISTS detections (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source              text NOT NULL,
  -- Upstream provider identifier, e.g. 'copernicus-cdse', 'copernicus-cmems'
  source_record_id    text NOT NULL,
  -- Unique ID in the upstream system — used for dedup
  acquisition_id      text NOT NULL,
  -- Satellite acquisition/pass reference (e.g. Sentinel-1 scene ID)
  detected_at         timestamptz NOT NULL,
  -- UTC timestamp of the satellite overpass
  ingested_at         timestamptz NOT NULL DEFAULT now(),
  -- When we persisted this record
  geometry            geometry(MultiPolygon, 4326) NOT NULL,
  -- Detection polygon(s) in WGS-84
  area_km2            numeric NOT NULL,
  -- Calculated area of the geometry in km²
  confidence          numeric NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  -- Normalised confidence score [0,1]
  confidence_tier     text NOT NULL CHECK (confidence_tier IN ('verified', 'probable', 'possible', 'anomaly')),
  -- Human-readable tier derived from confidence score and provenance
  pollutant_type      text NOT NULL DEFAULT 'oil',
  -- Type of pollution detected; oil is the only v0 type
  provenance          text NOT NULL,
  -- Processing chain that produced this record:
  --   'cdse-derived'  — pre-processed product from CDSE
  --   'cmems-derived' — pre-processed product from CMEMS
  --   'heuristic-v0'  — SAR acquisition footprint + simple heuristic (EXPERIMENTAL)
  thumbnail_url       text,
  -- URL to cached SAR tile thumbnail (Vercel Blob or upstream quick-look)
  raw_record_url      text,
  -- Link to the upstream record for provenance
  model_version       text,
  -- Version of the detection model or heuristic that produced this record
  metadata            jsonb NOT NULL DEFAULT '{}',
  -- Arbitrary upstream metadata (acquisition mode, orbit, track number, etc.)

  UNIQUE (source, source_record_id)
);

-- Temporal index — most queries filter on detected_at
CREATE INDEX IF NOT EXISTS detections_detected_at_idx ON detections (detected_at DESC);

-- Geospatial index — bbox and intersection queries
CREATE INDEX IF NOT EXISTS detections_geometry_idx ON detections USING GIST (geometry);

-- Source dedup index (also covered by unique constraint, but explicit for clarity)
CREATE INDEX IF NOT EXISTS detections_source_record_idx ON detections (source, source_record_id);

-- ============================================================================
-- schema_migrations — lightweight migration tracker
-- ============================================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     text PRIMARY KEY,
  applied_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO schema_migrations (version) VALUES ('001_initial')
ON CONFLICT (version) DO NOTHING;
