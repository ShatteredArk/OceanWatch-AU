/**
 * Seeds the database with known historical oil spill events for local development.
 * DO NOT run against production.
 *
 * Usage: POSTGRES_URL=... tsx db/seed.ts
 */
import { sql } from '@vercel/postgres';

const SEED_DETECTIONS = [
  {
    source: 'seed-historical',
    source_record_id: 'MONTARA-2009-001',
    acquisition_id: 'S1A_IW_GRDH_MONTARA_2009',
    detected_at: '2009-09-21T04:00:00Z',
    // Timor Sea, ~250km NW of Darwin (simplified polygon around Montara well H1)
    geometry_wkt: `MULTIPOLYGON(((123.5 -12.8, 124.2 -12.8, 124.2 -13.3, 123.5 -13.3, 123.5 -12.8)))`,
    area_km2: 3500,
    confidence: 0.92,
    confidence_tier: 'verified',
    pollutant_type: 'oil',
    provenance: 'cdse-derived',
    thumbnail_url: null,
    raw_record_url: 'https://en.wikipedia.org/wiki/Montara_oil_spill',
    model_version: 'seed-v0',
    metadata: { event: 'Montara oil spill', source_notes: 'Historical seed data for development' },
  },
  {
    source: 'seed-historical',
    source_record_id: 'PACIFIC-ADV-2009-001',
    acquisition_id: 'S1A_IW_GRDH_PACADV_2009',
    detected_at: '2009-03-11T06:00:00Z',
    // Off Moreton Island, SE Queensland
    geometry_wkt: `MULTIPOLYGON(((153.3 -26.8, 153.8 -26.8, 153.8 -27.4, 153.3 -27.4, 153.3 -26.8)))`,
    area_km2: 270,
    confidence: 0.87,
    confidence_tier: 'probable',
    pollutant_type: 'oil',
    provenance: 'cdse-derived',
    thumbnail_url: null,
    raw_record_url: 'https://en.wikipedia.org/wiki/Pacific_Adventurer_oil_spill',
    model_version: 'seed-v0',
    metadata: {
      event: 'Pacific Adventurer oil spill',
      source_notes: 'Historical seed data for development',
    },
  },
  {
    source: 'seed-heuristic',
    source_record_id: 'HEURISTIC-DEMO-2024-001',
    acquisition_id: 'S1A_IW_GRDH_1SDV_20240315T204512',
    detected_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    // Torres Strait
    geometry_wkt: `MULTIPOLYGON(((141.8 -9.5, 142.4 -9.5, 142.4 -10.1, 141.8 -10.1, 141.8 -9.5)))`,
    area_km2: 42,
    confidence: 0.1,
    confidence_tier: 'anomaly',
    pollutant_type: 'oil',
    provenance: 'heuristic-v0',
    thumbnail_url: null,
    raw_record_url:
      'https://catalogue.dataspace.copernicus.eu/odata/v1/Products?$filter=Name%20eq%20%27S1A_IW_GRDH_1SDV_20240315T204512%27',
    model_version: 'heuristic-v0',
    metadata: { source_notes: 'Heuristic demo record — EXPERIMENTAL, not a confirmed detection' },
  },
];

async function seed(): Promise<void> {
  console.log('Seeding development data…');

  for (const d of SEED_DETECTIONS) {
    await sql`
      INSERT INTO detections (
        source, source_record_id, acquisition_id, detected_at,
        geometry, area_km2, confidence, confidence_tier,
        pollutant_type, provenance, thumbnail_url, raw_record_url,
        model_version, metadata
      )
      VALUES (
        ${d.source},
        ${d.source_record_id},
        ${d.acquisition_id},
        ${d.detected_at}::timestamptz,
        ST_GeomFromText(${d.geometry_wkt}, 4326),
        ${d.area_km2},
        ${d.confidence},
        ${d.confidence_tier},
        ${d.pollutant_type},
        ${d.provenance},
        ${d.thumbnail_url ?? null},
        ${d.raw_record_url ?? null},
        ${d.model_version ?? null},
        ${JSON.stringify(d.metadata)}::jsonb
      )
      ON CONFLICT (source, source_record_id) DO NOTHING
    `;
    console.log(`  Inserted: ${d.source_record_id}`);
  }

  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
