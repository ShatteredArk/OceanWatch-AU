/**
 * GET /api/health
 *
 * Health check endpoint. Returns 200 when the service is up and the database
 * is reachable, 503 otherwise.
 */

import { NextResponse } from 'next/server';
import { pingDatabase } from '@/lib/db';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const START_TIME = Date.now();

export async function GET(): Promise<NextResponse> {
  const t0 = Date.now();
  let dbOk = false;

  try {
    dbOk = await pingDatabase();
  } catch (err) {
    logger.error('Health check DB ping failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const status = dbOk ? 200 : 503;
  const body = {
    status: dbOk ? 'ok' : 'degraded',
    version: process.env.npm_package_version ?? '0.1.0',
    uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000),
    checks: {
      database: dbOk ? 'ok' : 'error',
    },
    latency_ms: Date.now() - t0,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, { status });
}
