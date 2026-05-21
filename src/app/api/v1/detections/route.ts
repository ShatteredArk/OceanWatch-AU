/**
 * GET /api/v1/detections
 *
 * Public JSON API endpoint. Returns a GeoJSON FeatureCollection of
 * pollution detections matching the supplied query parameters.
 *
 * Query parameters:
 *   bbox          Comma-separated: minLon,minLat,maxLon,maxLat (WGS-84)
 *   start         ISO-8601 datetime (default: 30 days ago)
 *   end           ISO-8601 datetime (default: now)
 *   min_confidence  Number 0–1 (default: 0)
 *   tier          One of: verified, probable, possible, anomaly
 *   limit         Integer 1–1000 (default: 200)
 *   offset        Integer ≥ 0 (default: 0)
 *
 * See docs/api.md for the full contract.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { queryDetections, type ConfidenceTier } from '@/lib/detections';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const t0 = Date.now();
  const sp = req.nextUrl.searchParams;

  try {
    // --- bbox ---
    let bbox: [number, number, number, number] | undefined;
    const bboxParam = sp.get('bbox');
    if (bboxParam) {
      const parts = bboxParam.split(',').map(Number);
      if (
        parts.length !== 4 ||
        parts.some(isNaN) ||
        parts[0]! > parts[2]! ||
        parts[1]! > parts[3]!
      ) {
        return NextResponse.json(
          { error: 'bbox must be four numbers: minLon,minLat,maxLon,maxLat with min < max' },
          { status: 400 }
        );
      }
      bbox = parts as [number, number, number, number];
    }

    // --- time range ---
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let start: Date | undefined;
    let end: Date | undefined;

    if (sp.get('start')) {
      start = new Date(sp.get('start')!);
      if (isNaN(start.getTime())) {
        return NextResponse.json(
          { error: 'start must be a valid ISO-8601 datetime' },
          { status: 400 }
        );
      }
    } else {
      start = thirtyDaysAgo;
    }

    if (sp.get('end')) {
      end = new Date(sp.get('end')!);
      if (isNaN(end.getTime())) {
        return NextResponse.json(
          { error: 'end must be a valid ISO-8601 datetime' },
          { status: 400 }
        );
      }
    } else {
      end = now;
    }

    if (start > end) {
      return NextResponse.json({ error: 'start must be before end' }, { status: 400 });
    }

    // --- min_confidence ---
    let minConfidence = 0;
    if (sp.get('min_confidence')) {
      minConfidence = Number(sp.get('min_confidence'));
      if (isNaN(minConfidence) || minConfidence < 0 || minConfidence > 1) {
        return NextResponse.json(
          { error: 'min_confidence must be a number between 0 and 1' },
          { status: 400 }
        );
      }
    }

    // --- tier ---
    let tier: ConfidenceTier | undefined;
    const tierParam = sp.get('tier');
    if (tierParam) {
      const valid: ConfidenceTier[] = ['verified', 'probable', 'possible', 'anomaly'];
      if (!valid.includes(tierParam as ConfidenceTier)) {
        return NextResponse.json(
          { error: `tier must be one of: ${valid.join(', ')}` },
          { status: 400 }
        );
      }
      tier = tierParam as ConfidenceTier;
    }

    // --- pagination ---
    const limit = Math.min(Number(sp.get('limit') ?? 200), 1000);
    const offset = Math.max(Number(sp.get('offset') ?? 0), 0);

    if (isNaN(limit) || limit < 1) {
      return NextResponse.json({ error: 'limit must be a positive integer' }, { status: 400 });
    }

    const fc = await queryDetections({ bbox, start, end, minConfidence, tier, limit, offset });

    const ms = Date.now() - t0;
    logger.info('GET /api/v1/detections', {
      count: fc.features.length,
      ms,
      bbox: bboxParam,
      tier,
      minConfidence,
    });

    return NextResponse.json(fc, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'X-Response-Time': `${ms}ms`,
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/geo+json',
      },
    });
  } catch (err) {
    logger.error('GET /api/v1/detections failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
