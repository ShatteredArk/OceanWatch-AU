/**
 * Home page — server component that fetches initial detections and passes
 * them to the client-side GlobeView.
 *
 * Falls back to static demo detections when the database is empty or
 * unavailable (initial deploy, local dev without seeds, etc.).
 */

import { GlobeView } from '@/components/GlobeView';
import { queryDetections } from '@/lib/detections';
import { getDemoDetections } from '@/lib/demo-detections';
import type { DetectionFeatureCollection } from '@/lib/detections';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getInitialDetections(): Promise<{
  data: DetectionFeatureCollection;
  isDemoMode: boolean;
}> {
  try {
    const result = await queryDetections({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
      limit: 500,
    });
    if (result.features.length > 0) {
      return { data: result, isDemoMode: false };
    }
    return { data: getDemoDetections(), isDemoMode: true };
  } catch {
    // DB not available (e.g. before migration runs) — show demo data so the
    // globe is never blank on first load.
    return { data: getDemoDetections(), isDemoMode: true };
  }
}

export default async function HomePage() {
  const { data: initialDetections, isDemoMode } = await getInitialDetections();

  return <GlobeView initialDetections={initialDetections} isDemoMode={isDemoMode} />;
}
