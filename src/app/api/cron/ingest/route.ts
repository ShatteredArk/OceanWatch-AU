/**
 * POST /api/cron/ingest
 *
 * Vercel Cron endpoint — triggers the data ingestion pipeline.
 * Scheduled every 6 hours via vercel.json.
 *
 * Security: Vercel sets the Authorization header to "Bearer <CRON_SECRET>"
 * on cron invocations. We validate this to prevent external triggering.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { runIngest } from '@/lib/ingest';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes — ingest can take a while

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('Cron ingest rejected — invalid authorization');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  logger.info('Cron ingest started');

  try {
    const result = await runIngest({ lookbackDays: 7, maxResultsPerSource: 50 });

    logger.info('Cron ingest succeeded', result);

    return NextResponse.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Cron ingest failed', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });

    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
