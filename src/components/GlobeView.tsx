'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { IncidentPanel } from './IncidentPanel';
import { TimeScrubber } from './TimeScrubber';
import { Footer } from './Footer';
import type { DetectionFeatureCollection, DetectionFeature } from '@/lib/detections';
import { getAmsaIncidents } from '@/lib/amsa-incidents';

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

// Animates a number from its previous value to `target` using ease-out cubic.
// Returns the current animated value (starts at 0 on initial mount).
function useAnimatedCount(target: number, duration = 700): number {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;
    let cancelled = false;
    const start = performance.now();

    function step(now: number) {
      if (cancelled) return;
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(from + (target - from) * eased));
      if (t < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
    return () => {
      cancelled = true;
    };
  }, [target, duration]);

  return display;
}

export function GlobeView({ initialDetections, isDemoMode = false }: GlobeViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scrubberTime, setScrubberTime] = useState<number>(() => Date.now());

  // AMSA historical incidents — static, always rendered regardless of scrubber
  const amsaIncidents = useMemo(() => getAmsaIncidents(), []);
  // Empty on SSR; filled after hydration to avoid mismatch
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const tick = () => setUtcTime(new Date().toISOString().slice(11, 19));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

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
    return (
      initialDetections.features.find((f) => f.properties.id === selectedId) ??
      amsaIncidents.features.find((f) => f.properties.id === selectedId) ??
      null
    );
  }, [initialDetections, amsaIncidents, selectedId]);

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

  // Animated display values for each tier count
  const animVerified = useAnimatedCount(tierCounts.verified ?? 0);
  const animProbable = useAnimatedCount(tierCounts.probable ?? 0);
  const animPossible = useAnimatedCount(tierCounts.possible ?? 0);
  const animAnomaly = useAnimatedCount(tierCounts.anomaly ?? 0);

  const animCounts: Record<string, number> = {
    verified: animVerified,
    probable: animProbable,
    possible: animPossible,
    anomaly: animAnomaly,
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#020b18]">
      {/* Globe fills the viewport */}
      <Globe
        detections={filteredDetections}
        amsaIncidents={amsaIncidents}
        onDetectionClick={handleDetectionClick}
        selectedId={selectedId}
      />

      {/* Atmospheric vignette — dark edges + subtle blue halo */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: [
            'radial-gradient(ellipse at center, transparent 38%, rgba(2,11,24,0.55) 100%)',
            'radial-gradient(ellipse at center, transparent 44%, rgba(14,42,80,0.07) 56%, transparent 65%)',
          ].join(', '),
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

        <div className="flex items-center gap-4">
          {/* Confidence tier legend with animated counts */}
          <div className="hidden sm:flex items-center gap-3 text-xs">
            {(
              [
                { key: 'verified', label: 'Verified', color: '#ef4444' },
                { key: 'probable', label: 'Probable', color: '#f59e0b' },
                { key: 'possible', label: 'Possible', color: '#fcd34d' },
                { key: 'anomaly', label: 'Anomaly', color: '#818cf8' },
              ] as const
            ).map(({ key, label, color }) => {
              const n = animCounts[key] ?? 0;
              const raw = tierCounts[key] ?? 0;
              return (
                <span key={key} className="flex items-center gap-1 text-slate-400">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: color, opacity: 0.85 }}
                  />
                  <span className={raw ? 'text-slate-300' : 'text-slate-600'}>
                    {label}
                    {raw ? <span className="ml-1 tabular-nums">({n})</span> : null}
                  </span>
                </span>
              );
            })}
          </div>

          {/* Live UTC clock */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 border-l border-white/5 pl-4">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"
              style={{ animation: 'detection-pulse 2s ease-in-out infinite' }}
            />
            {utcTime ? (
              <span className="font-mono tabular-nums">
                {utcTime} <span className="text-slate-700">UTC</span>
              </span>
            ) : (
              <span>Live</span>
            )}
          </div>
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
