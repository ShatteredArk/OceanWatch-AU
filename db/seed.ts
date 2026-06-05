/**
 * Seeds the database with development/demo detections.
 * Includes known historical events plus realistic recent demo records.
 * DO NOT run against production.
 *
 * Usage: POSTGRES_URL=... tsx db/seed.ts
 */
import { sql } from '@vercel/postgres';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function ago(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

interface SeedDetection {
  source: string;
  source_record_id: string;
  acquisition_id: string;
  detected_at: string;
  geometry_wkt: string;
  area_km2: number;
  confidence: number;
  confidence_tier: string;
  pollutant_type: string;
  provenance: string;
  thumbnail_url: string | null;
  raw_record_url: string | null;
  model_version: string | null;
  metadata: Record<string, unknown>;
}

const SEED_DETECTIONS: SeedDetection[] = [
  // ── Historical events ──────────────────────────────────────────────────────

  {
    source: 'seed-historical',
    source_record_id: 'MONTARA-2009-001',
    acquisition_id: 'S1A_IW_GRDH_MONTARA_2009',
    detected_at: '2009-09-21T04:00:00Z',
    // Timor Sea, ~250 km NW of Darwin
    geometry_wkt: `MULTIPOLYGON(((123.5 -12.8, 124.2 -12.8, 124.2 -13.3, 123.5 -13.3, 123.5 -12.8)))`,
    area_km2: 3500,
    confidence: 0.92,
    confidence_tier: 'verified',
    pollutant_type: 'oil',
    provenance: 'cdse-derived',
    thumbnail_url: null,
    raw_record_url: 'https://en.wikipedia.org/wiki/Montara_oil_spill',
    model_version: 'seed-v0',
    metadata: { event: 'Montara oil spill', source_notes: 'Historical seed — development only' },
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
      source_notes: 'Historical seed — development only',
    },
  },

  // ── Very fresh (< 2 h) — pulse ─────────────────────────────────────────────

  {
    source: 'seed-demo',
    source_record_id: 'DEMO-TORRES-FRESH',
    acquisition_id: 'S1B_IW_GRDH_DEMO_TORRES',
    detected_at: ago(35 * MIN),
    geometry_wkt: `MULTIPOLYGON(((141.3 -9.5, 141.8 -9.5, 141.8 -9.9, 141.3 -9.9, 141.3 -9.5)))`,
    area_km2: 18,
    confidence: 0.12,
    confidence_tier: 'anomaly',
    pollutant_type: 'oil',
    provenance: 'heuristic-v0',
    thumbnail_url: null,
    raw_record_url: null,
    model_version: 'heuristic-v0',
    metadata: { zone: 'Torres Strait', notes: 'Demo — unvalidated SAR anomaly' },
  },
  {
    source: 'seed-demo',
    source_record_id: 'DEMO-CARPENTARIA-FRESH',
    acquisition_id: 'S1A_IW_GRDH_DEMO_CARP',
    detected_at: ago(1.1 * HOUR),
    geometry_wkt: `MULTIPOLYGON(((136.3 -12.85, 137.0 -12.85, 137.0 -13.4, 136.3 -13.4, 136.3 -12.85)))`,
    area_km2: 32,
    confidence: 0.08,
    confidence_tier: 'anomaly',
    pollutant_type: 'oil',
    provenance: 'heuristic-v0',
    thumbnail_url: null,
    raw_record_url: null,
    model_version: 'heuristic-v0',
    metadata: { zone: 'Gulf of Carpentaria', notes: 'Demo — unvalidated SAR anomaly' },
  },
  {
    source: 'seed-demo',
    source_record_id: 'DEMO-JERVIS-FRESH',
    acquisition_id: 'S1A_IW_GRDH_DEMO_JERVIS',
    detected_at: ago(45 * MIN),
    geometry_wkt: `MULTIPOLYGON(((150.7 -34.7, 151.1 -34.7, 151.1 -35.0, 150.7 -35.0, 150.7 -34.7)))`,
    area_km2: 12,
    confidence: 0.09,
    confidence_tier: 'anomaly',
    pollutant_type: 'oil',
    provenance: 'heuristic-v0',
    thumbnail_url: null,
    raw_record_url: null,
    model_version: 'heuristic-v0',
    metadata: { zone: 'Jervis Bay', notes: 'Demo — unvalidated SAR anomaly' },
  },

  // ── Fresh (2–24 h) — pulse ─────────────────────────────────────────────────

  {
    source: 'seed-demo',
    source_record_id: 'DEMO-TIMOR-VERIFIED',
    acquisition_id: 'S1A_IW_GRDH_DEMO_TIMOR',
    detected_at: ago(2 * HOUR),
    geometry_wkt: `MULTIPOLYGON(((123.5 -11.4, 124.7 -11.4, 124.7 -12.3, 123.5 -12.3, 123.5 -11.4)))`,
    area_km2: 1850,
    confidence: 0.93,
    confidence_tier: 'verified',
    pollutant_type: 'oil',
    provenance: 'cdse-derived',
    thumbnail_url: null,
    raw_record_url: null,
    model_version: 'cdse-v1',
    metadata: { zone: 'Timor Sea', notes: 'Demo — high-confidence SAR detection' },
  },
  {
    source: 'seed-demo',
    source_record_id: 'DEMO-BASS-VERIFIED',
    acquisition_id: 'S1B_IW_GRDH_DEMO_BASS',
    detected_at: ago(12 * HOUR),
    geometry_wkt: `MULTIPOLYGON(((146.4 -38.85, 147.3 -38.85, 147.3 -39.5, 146.4 -39.5, 146.4 -38.85)))`,
    area_km2: 410,
    confidence: 0.91,
    confidence_tier: 'verified',
    pollutant_type: 'oil',
    provenance: 'cdse-derived',
    thumbnail_url: null,
    raw_record_url: null,
    model_version: 'cdse-v1',
    metadata: { zone: 'Bass Strait', notes: 'Demo — confirmed oil slick near production platform' },
  },
  {
    source: 'seed-demo',
    source_record_id: 'DEMO-SYDNEY-VERIFIED',
    acquisition_id: 'S1A_IW_GRDH_DEMO_SYDNEY',
    detected_at: ago(6 * HOUR),
    geometry_wkt: `MULTIPOLYGON(((151.7 -33.65, 152.3 -33.65, 152.3 -34.1, 151.7 -34.1, 151.7 -33.65)))`,
    area_km2: 95,
    confidence: 0.88,
    confidence_tier: 'verified',
    pollutant_type: 'oil',
    provenance: 'cdse-derived',
    thumbnail_url: null,
    raw_record_url: null,
    model_version: 'cdse-v1',
    metadata: { zone: 'Sydney offshore', notes: 'Demo — vessel discharge detection' },
  },
  {
    source: 'seed-demo',
    source_record_id: 'DEMO-NWSHELF-PROBABLE',
    acquisition_id: 'S1A_IW_GRDH_DEMO_NWS',
    detected_at: ago(6.5 * HOUR),
    geometry_wkt: `MULTIPOLYGON(((115.3 -18.8, 116.3 -18.8, 116.3 -19.6, 115.3 -19.6, 115.3 -18.8)))`,
    area_km2: 340,
    confidence: 0.72,
    confidence_tier: 'probable',
    pollutant_type: 'oil',
    provenance: 'cdse-derived',
    thumbnail_url: null,
    raw_record_url: null,
    model_version: 'cdse-v1',
    metadata: { zone: 'NW Shelf (Barrow Island)', notes: 'Demo — probable oil sheen' },
  },
  {
    source: 'seed-demo',
    source_record_id: 'DEMO-DARWIN-POSSIBLE',
    acquisition_id: 'S1B_IW_GRDH_DEMO_DARWIN',
    detected_at: ago(2.2 * HOUR),
    geometry_wkt: `MULTIPOLYGON(((130.6 -11.9, 131.1 -11.9, 131.1 -12.3, 130.6 -12.3, 130.6 -11.9)))`,
    area_km2: 52,
    confidence: 0.41,
    confidence_tier: 'possible',
    pollutant_type: 'oil',
    provenance: 'cdse-derived',
    thumbnail_url: null,
    raw_record_url: null,
    model_version: 'cdse-v1',
    metadata: { zone: 'Darwin Harbour approaches', notes: 'Demo — possible vessel discharge' },
  },

  // ── Recent (1–7 days) ──────────────────────────────────────────────────────

  {
    source: 'seed-demo',
    source_record_id: 'DEMO-CORAL-PROBABLE',
    acquisition_id: 'S1A_IW_GRDH_DEMO_CORAL',
    detected_at: ago(1 * DAY),
    geometry_wkt: `MULTIPOLYGON(((151.3 -15.2, 152.4 -15.2, 152.4 -16.0, 151.3 -16.0, 151.3 -15.2)))`,
    area_km2: 480,
    confidence: 0.67,
    confidence_tier: 'probable',
    pollutant_type: 'oil',
    provenance: 'cdse-derived',
    thumbnail_url: null,
    raw_record_url: null,
    model_version: 'cdse-v1',
    metadata: { zone: 'Coral Sea', notes: 'Demo — shipping lane anomaly' },
  },
  {
    source: 'seed-demo',
    source_record_id: 'DEMO-GBR-POSSIBLE',
    acquisition_id: 'S1B_IW_GRDH_DEMO_GBR',
    detected_at: ago(3 * DAY),
    geometry_wkt: `MULTIPOLYGON(((145.3 -17.0, 146.1 -17.0, 146.1 -17.6, 145.3 -17.6, 145.3 -17.0)))`,
    area_km2: 140,
    confidence: 0.38,
    confidence_tier: 'possible',
    pollutant_type: 'oil',
    provenance: 'cdse-derived',
    thumbnail_url: null,
    raw_record_url: null,
    model_version: 'cdse-v1',
    metadata: { zone: 'Great Barrier Reef (central)', notes: 'Demo — possible surface sheen' },
  },
  {
    source: 'seed-demo',
    source_record_id: 'DEMO-JBG-ANOMALY',
    acquisition_id: 'S1A_IW_GRDH_DEMO_JBG',
    detected_at: ago(3.5 * DAY),
    geometry_wkt: `MULTIPOLYGON(((128.3 -13.05, 129.0 -13.05, 129.0 -13.6, 128.3 -13.6, 128.3 -13.05)))`,
    area_km2: 25,
    confidence: 0.11,
    confidence_tier: 'anomaly',
    pollutant_type: 'oil',
    provenance: 'heuristic-v0',
    thumbnail_url: null,
    raw_record_url: null,
    model_version: 'heuristic-v0',
    metadata: { zone: 'Joseph Bonaparte Gulf', notes: 'Demo — unvalidated SAR anomaly' },
  },
  {
    source: 'seed-demo',
    source_record_id: 'DEMO-SEQLD-POSSIBLE',
    acquisition_id: 'S1B_IW_GRDH_DEMO_SEQLD',
    detected_at: ago(5 * DAY),
    geometry_wkt: `MULTIPOLYGON(((152.8 -25.6, 153.7 -25.6, 153.7 -26.3, 152.8 -26.3, 152.8 -25.6)))`,
    area_km2: 210,
    confidence: 0.44,
    confidence_tier: 'possible',
    pollutant_type: 'oil',
    provenance: 'cdse-derived',
    thumbnail_url: null,
    raw_record_url: null,
    model_version: 'cdse-v1',
    metadata: { zone: 'SE Queensland coast', notes: 'Demo — coastal discharge investigation' },
  },
  {
    source: 'seed-demo',
    source_record_id: 'DEMO-SPENCER-ANOMALY',
    acquisition_id: 'S1A_IW_GRDH_DEMO_SPENCER',
    detected_at: ago(4 * DAY),
    geometry_wkt: `MULTIPOLYGON(((136.0 -33.3, 136.6 -33.3, 136.6 -33.8, 136.0 -33.8, 136.0 -33.3)))`,
    area_km2: 18,
    confidence: 0.14,
    confidence_tier: 'anomaly',
    pollutant_type: 'oil',
    provenance: 'heuristic-v0',
    thumbnail_url: null,
    raw_record_url: null,
    model_version: 'heuristic-v0',
    metadata: { zone: 'Spencer Gulf', notes: 'Demo — unvalidated SAR anomaly' },
  },
  {
    source: 'seed-demo',
    source_record_id: 'DEMO-ARAFURA-ANOMALY',
    acquisition_id: 'S1B_IW_GRDH_DEMO_ARAFURA',
    detected_at: ago(5.5 * DAY),
    geometry_wkt: `MULTIPOLYGON(((133.3 -9.7, 134.1 -9.7, 134.1 -10.3, 133.3 -10.3, 133.3 -9.7)))`,
    area_km2: 38,
    confidence: 0.09,
    confidence_tier: 'anomaly',
    pollutant_type: 'oil',
    provenance: 'heuristic-v0',
    thumbnail_url: null,
    raw_record_url: null,
    model_version: 'heuristic-v0',
    metadata: { zone: 'Arafura Sea', notes: 'Demo — unvalidated SAR anomaly' },
  },
  {
    source: 'seed-demo',
    source_record_id: 'DEMO-PORTPHILLIP-POSSIBLE',
    acquisition_id: 'S1B_IW_GRDH_DEMO_PPB',
    detected_at: ago(2 * DAY),
    geometry_wkt: `MULTIPOLYGON(((144.6 -37.85, 145.3 -37.85, 145.3 -38.4, 144.6 -38.4, 144.6 -37.85)))`,
    area_km2: 78,
    confidence: 0.52,
    confidence_tier: 'possible',
    pollutant_type: 'oil',
    provenance: 'cdse-derived',
    thumbnail_url: null,
    raw_record_url: null,
    model_version: 'cdse-v1',
    metadata: { zone: 'Port Phillip approaches', notes: 'Demo — possible vessel discharge' },
  },

  // ── Older (7–30 days) ──────────────────────────────────────────────────────

  {
    source: 'seed-demo',
    source_record_id: 'DEMO-PERTH-POSSIBLE',
    acquisition_id: 'S1A_IW_GRDH_DEMO_PERTH',
    detected_at: ago(7 * DAY),
    geometry_wkt: `MULTIPOLYGON(((112.3 -30.6, 113.2 -30.6, 113.2 -31.3, 112.3 -31.3, 112.3 -30.6)))`,
    area_km2: 165,
    confidence: 0.35,
    confidence_tier: 'possible',
    pollutant_type: 'oil',
    provenance: 'cdse-derived',
    thumbnail_url: null,
    raw_record_url: null,
    model_version: 'cdse-v1',
    metadata: { zone: 'Perth Canyon', notes: 'Demo — possible oil sheen' },
  },
  {
    source: 'seed-demo',
    source_record_id: 'DEMO-TASMAN-PROBABLE',
    acquisition_id: 'S1A_IW_GRDH_DEMO_TASMAN',
    detected_at: ago(8 * DAY),
    geometry_wkt: `MULTIPOLYGON(((157.3 -34.1, 158.5 -34.1, 158.5 -35.0, 157.3 -35.0, 157.3 -34.1)))`,
    area_km2: 620,
    confidence: 0.63,
    confidence_tier: 'probable',
    pollutant_type: 'oil',
    provenance: 'cdse-derived',
    thumbnail_url: null,
    raw_record_url: null,
    model_version: 'cdse-v1',
    metadata: { zone: 'Tasman Sea', notes: 'Demo — shipping route detection' },
  },
  {
    source: 'seed-demo',
    source_record_id: 'DEMO-NEWCAL-PROBABLE',
    acquisition_id: 'S1A_IW_GRDH_DEMO_NEWCAL',
    detected_at: ago(10 * DAY),
    geometry_wkt: `MULTIPOLYGON(((165.3 -20.7, 166.1 -20.7, 166.1 -21.3, 165.3 -21.3, 165.3 -20.7)))`,
    area_km2: 260,
    confidence: 0.69,
    confidence_tier: 'probable',
    pollutant_type: 'oil',
    provenance: 'cdse-derived',
    thumbnail_url: null,
    raw_record_url: null,
    model_version: 'cdse-v1',
    metadata: { zone: 'New Caledonia EEZ', notes: 'Demo — Pacific shipping route detection' },
  },
  {
    source: 'seed-demo',
    source_record_id: 'DEMO-GAB-ANOMALY',
    acquisition_id: 'S1A_IW_GRDH_DEMO_GAB',
    detected_at: ago(15 * DAY),
    geometry_wkt: `MULTIPOLYGON(((127.3 -32.85, 128.3 -32.85, 128.3 -33.6, 127.3 -33.6, 127.3 -32.85)))`,
    area_km2: 48,
    confidence: 0.13,
    confidence_tier: 'anomaly',
    pollutant_type: 'oil',
    provenance: 'heuristic-v0',
    thumbnail_url: null,
    raw_record_url: null,
    model_version: 'heuristic-v0',
    metadata: { zone: 'Great Australian Bight', notes: 'Demo — unvalidated SAR anomaly' },
  },
  {
    source: 'seed-demo',
    source_record_id: 'DEMO-TASMANIA-POSSIBLE',
    acquisition_id: 'S1B_IW_GRDH_DEMO_TAS',
    detected_at: ago(12 * DAY),
    geometry_wkt: `MULTIPOLYGON(((146.3 -43.6, 147.2 -43.6, 147.2 -44.3, 146.3 -44.3, 146.3 -43.6)))`,
    area_km2: 185,
    confidence: 0.34,
    confidence_tier: 'possible',
    pollutant_type: 'oil',
    provenance: 'cdse-derived',
    thumbnail_url: null,
    raw_record_url: null,
    model_version: 'cdse-v1',
    metadata: {
      zone: 'Southern Ocean approaches (SE Tasmania)',
      notes: 'Demo — possible oil trail',
    },
  },
  {
    source: 'seed-demo',
    source_record_id: 'DEMO-EXMOUTH-POSSIBLE',
    acquisition_id: 'S1B_IW_GRDH_DEMO_EXMOUTH',
    detected_at: ago(20 * DAY),
    geometry_wkt: `MULTIPOLYGON(((113.6 -20.75, 114.3 -20.75, 114.3 -21.3, 113.6 -21.3, 113.6 -20.75)))`,
    area_km2: 88,
    confidence: 0.31,
    confidence_tier: 'possible',
    pollutant_type: 'oil',
    provenance: 'cdse-derived',
    thumbnail_url: null,
    raw_record_url: null,
    model_version: 'cdse-v1',
    metadata: { zone: 'Exmouth Gulf', notes: 'Demo — suspected vessel discharge' },
  },
];

async function seed(): Promise<void> {
  console.log(`Seeding ${SEED_DETECTIONS.length} development detections…`);

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
