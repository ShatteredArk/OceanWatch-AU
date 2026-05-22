'use client';

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { IncidentPanel } from './IncidentPanel';
import { TimeScrubber } from './TimeScrubber';
import { Footer } from './Footer';
import type { DetectionFeatureCollection, DetectionFeature } from '@/lib/detections';

// Dynamically import the Globe to keep the initial JS bundle under 200kB.
// MapLibre GL JS (~800kB gzipped) loads only after the component mounts.
const Globe = dynamic(() => import('./Globe').then((m) => ({ default: m.Globe })), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#020b18]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500/50 border-t-indigo-400 rounded-full animate-spin" />
        <span className="text-slate-500 text-sm">Loading globe…</span>
      </div>
    </div>
  ),
});

interface GlobeViewProps {
  initialDetections: DetectionFeatureCollection;
  isDemoMode?: boolean;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function GlobeView({ initialDetections, isDemoMode = false }: GlobeViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scrubberTime, setScrubberTime] = useState<number>(() => Date.now());

  // Filter detections based on the time scrubber position.
  // The scrubber value is the "end" time; we always show the last 30 days up to that point.
  const filteredDetections = useMemo((): DetectionFeatureCollection => {
    const endMs = scrubberTime;
    const startMs = endMs - THIRTY_DAYS_MS;

    return {
      type: 'FeatureCollection',
      features: initialDetections.features.filter((f) => {
        const ts = new Date(f.properties.detected_at).getTime();
        return ts >= startMs && ts <= endMs;
      }),
    };
  }, [initialDetections, scrubberTime]);

  const selectedFeature = useMemo((): DetectionFeature | null => {
    if (!selectedId) return null;
    return initialDetections.features.find((f) => f.properties.id === selectedId) ?? null;
  }, [initialDetections, selectedId]);

  const handleDetectionClick = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handlePanelClose = useCallback(() => setSelectedId(null), []);

  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {
      verified: 0,
      probable: 0,
      possible: 0,
      anomaly: 0,
    };
    for (const f of filteredDetections.features) {
      const tier = f.properties.confidence_tier;
      if (tier in counts) counts[tier]!++;
    }
    return counts;
  }, [filteredDetections]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#020b18]">
      {/* Globe fills the viewport */}
      <Globe
        detections={filteredDetections}
        onDetectionClick={handleDetectionClick}
        selectedId={selectedId}
      />

      {/* Radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(2,11,24,0.45) 100%)',
        }}
      />

      {/* Header */}
      <header
        className="absolute top-0 left-0 right-0 z-10 px-4 py-3 flex items-center justify-between border-b border-white/5"
        style={{ background: 'rgba(6,21,37,0.6)', backdropFilter: 'blur(8px)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-slate-100 font-semibold text-sm tracking-wide">OceanWatch AU</span>
          <span className="hidden sm:inline text-slate-600 text-xs">
            Near-real-time ocean pollution detections
          </span>
          {isDemoMode && (
            <span className="inline-flex items-center rounded border border-amber-700/40 bg-amber-950/30 px-2 py-0.5 text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Demo
            </span>
          )}
        </div>

        {/* Confidence tier legend */}
        <div className="hidden sm:flex items-center gap-3 text-xs">
          {(
            [
              { key: 'verified', label: 'Verified', color: '#ef4444' },
              { key: 'probable', label: 'Probable', color: '#f59e0b' },
              { key: 'possible', label: 'Possible', color: '#fcd34d' },
              { key: 'anomaly', label: 'Anomaly', color: '#818cf8' },
            ] as const
          ).map(({ key, label, color }) => (
            <span key={key} className="flex items-center gap-1 text-slate-400">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: color, opacity: 0.85 }}
              />
              <span className={tierCounts[key] ? 'text-slate-300' : 'text-slate-600'}>
                {label} {tierCounts[key] ? `(${tierCounts[key]})` : ''}
              </span>
            </span>
          ))}
        </div>
      </header>

      {/* Incident panel */}
      <IncidentPanel feature={selectedFeature} onClose={handlePanelClose} />

      {/* Time scrubber */}
      <TimeScrubber value={scrubberTime} onChange={setScrubberTime} />

      {/* Footer */}
      <Footer />
    </div>
  );
}
