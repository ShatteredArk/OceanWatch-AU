/**
 * Integration tests for the ingest pipeline.
 * All external calls are mocked — no real Copernicus or Postgres calls in CI.
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import type { CdseProduct } from '../copernicus';

// Mock Copernicus module before importing ingest
vi.mock('../copernicus', () => ({
  fetchCmemsOilSlickProducts: vi.fn().mockResolvedValue([]),
  fetchCdseProducts: vi.fn(),
  extractQuicklookUrl: vi.fn().mockReturnValue(null),
  AUS_PACIFIC_BBOX: { west: 94.0, south: -47.0, east: 169.0, north: -8.0 },
}));

// Mock @vercel/postgres db — factory must be self-contained (vi.mock is hoisted)
vi.mock('@vercel/postgres', () => ({
  db: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
  },
  sql: vi.fn(),
}));

import { runIngest } from '../ingest';
import { fetchCdseProducts } from '../copernicus';
import { db } from '@vercel/postgres';

const mockFetchCdseProducts = fetchCdseProducts as MockedFunction<typeof fetchCdseProducts>;
// db.query is mocked above; cast to vi.fn() shape for test helpers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDbQuery = db.query as unknown as ReturnType<typeof vi.fn<any>>;

const mockProduct: CdseProduct = {
  Id: 'test-product-id-1',
  Name: 'S1A_IW_GRDH_1SDV_20240315T204512_20240315T204537_052975_066BE2_7B42',
  ContentDate: {
    Start: '2024-03-15T20:45:12Z',
    End: '2024-03-15T20:45:37Z',
  },
  Footprint: 'POLYGON((140 -10, 145 -10, 145 -15, 140 -15, 140 -10))',
  ProductType: 'GRD',
  Attributes: [],
  Assets: [],
};

describe('runIngest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockDbQuery.mockResolvedValue({ rows: [] } as any);
  });

  it('returns attempted and upserted counts', async () => {
    mockFetchCdseProducts.mockResolvedValue([mockProduct]);

    const result = await runIngest({ lookbackDays: 1, maxResultsPerSource: 10 });

    expect(result.attempted).toBe(1);
    expect(result.upserted).toBe(1);
    expect(result.errors).toBe(0);
    expect(result.sources).toContain('cdse');
  });

  it('wraps POLYGON footprint in MULTIPOLYGON', async () => {
    let capturedWkt = '';

    mockDbQuery.mockImplementationOnce(async (...args: unknown[]) => {
      const values = args[1] as unknown[];
      // The geometry WKT is the 5th parameter ($5)
      capturedWkt = values[4] as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { rows: [] } as any;
    });

    mockFetchCdseProducts.mockResolvedValue([mockProduct]);

    await runIngest({ lookbackDays: 1, maxResultsPerSource: 10 });

    expect(capturedWkt).toMatch(/^MULTIPOLYGON/i);
  });

  it('is idempotent — duplicate products result in zero errors', async () => {
    mockFetchCdseProducts.mockResolvedValue([mockProduct, mockProduct]);

    const result = await runIngest({ lookbackDays: 1, maxResultsPerSource: 10 });

    expect(result.errors).toBe(0);
    expect(result.attempted).toBe(2);
  });

  it('handles empty CDSE response gracefully', async () => {
    mockFetchCdseProducts.mockResolvedValue([]);

    const result = await runIngest({ lookbackDays: 1 });

    expect(result.attempted).toBe(0);
    expect(result.upserted).toBe(0);
    expect(result.errors).toBe(0);
  });

  it('records errors and continues when upsert fails', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockDbQuery.mockRejectedValueOnce(new Error('DB connection error') as any);

    mockFetchCdseProducts.mockResolvedValue([mockProduct]);

    const result = await runIngest({ lookbackDays: 1 });

    expect(result.attempted).toBe(1);
    expect(result.errors).toBe(1);
    expect(result.upserted).toBe(0);
  });
});
