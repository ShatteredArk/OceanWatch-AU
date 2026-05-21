/**
 * Home page — server component that fetches initial detections and passes
 * them to the client-side GlobeView.
 *
 * We fetch the last 30 days on the server so the first render has data
 * without a client-side waterfall.
 */

import { GlobeView } from '@/components/GlobeView';
import { queryDetections } from '@/lib/detections';
import type { DetectionFeatureCollection } from '@/lib/detections';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getInitialDetections(): Promise<DetectionFeatureCollection> {
  try {
    return await queryDetections({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
      limit: 500,
    });
  } catch {
    // If the DB isn't available (e.g. during initial deploy before migration),
    // return an empty FeatureCollection so the globe still renders.
    return { type: 'FeatureCollection', features: [] };
  }
}

export default async function HomePage() {
  const initialDetections = await getInitialDetections();

  return <GlobeView initialDetections={initialDetections} />;
}
