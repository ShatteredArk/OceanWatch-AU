'use client';

import { useEffect, useRef } from 'react';
import type { DetectionFeature } from '@/lib/detections';

interface IncidentPanelProps {
  feature: DetectionFeature | null;
  onClose: () => void;
}

const TIER_LABEL: Record<string, string> = {
  verified: 'Verified',
  probable: 'Probable',
  possible: 'Possible',
  anomaly: 'Anomaly',
};

const TIER_CLASSES: Record<string, string> = {
  verified: 'text-red-400 bg-red-950/40 border-red-800/40',
  probable: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
  possible: 'text-yellow-300 bg-yellow-950/30 border-yellow-800/30',
  anomaly: 'text-indigo-400 bg-indigo-950/40 border-indigo-800/40',
};

function formatUtc(iso: string): string {
  return new Date(iso).toUTCString().replace('GMT', 'UTC');
}

function formatLocal(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

export function IncidentPanel({ feature, onClose }: IncidentPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [onClose]);

  if (!feature) return null;

  const p = feature.properties;
  const tierClass = TIER_CLASSES[p.confidence_tier] ?? TIER_CLASSES.anomaly;
  const isAmsa = p.provenance === 'amsa-historical';
  const isDemo = p.source === 'demo';

  const vessel = str(p.metadata?.vessel);
  const quantity = str(p.metadata?.quantity);
  const incidentDate = str(p.metadata?.date);
  const notes = str(p.metadata?.notes);

  return (
    <div
      ref={panelRef}
      className="incident-panel absolute top-4 right-4 z-20 w-80 max-h-[calc(100vh-120px)] overflow-y-auto rounded-lg border border-white/8 bg-[rgba(6,21,37,0.88)] backdrop-blur-md shadow-2xl"
      role="dialog"
      aria-label="Detection incident details"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-100 tracking-wide">
          {isAmsa ? 'Historical Incident' : 'Detection Details'}
        </h2>
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="text-slate-400 hover:text-slate-100 transition-colors text-lg leading-none"
        >
          ✕
        </button>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* AMSA Historical banner */}
        {isAmsa && (
          <div className="flex items-start gap-2 rounded border border-sky-700/40 bg-sky-950/30 px-3 py-2">
            <span className="text-sky-400 text-xs font-semibold uppercase tracking-wider shrink-0 mt-0.5">
              AMSA Verified
            </span>
            <span className="text-sky-300/80 text-xs">
              Sourced from the Australian Maritime Safety Authority incident registry.
            </span>
          </div>
        )}

        {/* Demo data banner */}
        {isDemo && (
          <div className="flex items-start gap-2 rounded border border-slate-600/40 bg-slate-800/30 px-3 py-2">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider shrink-0 mt-0.5">
              Demo
            </span>
            <span className="text-slate-500 text-xs">
              Simulated detection — not a real pollution event.
            </span>
          </div>
        )}

        {/* Experimental badge (non-demo heuristic) */}
        {p.is_experimental && !isDemo && !isAmsa && (
          <div className="flex items-center gap-2 rounded border border-orange-700/40 bg-orange-950/30 px-3 py-2">
            <span className="text-orange-400 text-xs font-semibold uppercase tracking-wider">
              Experimental
            </span>
            <span className="text-orange-300/80 text-xs">
              Unvalidated heuristic — not a confirmed detection
            </span>
          </div>
        )}

        {/* Confidence tier badge */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${tierClass}`}
          >
            {TIER_LABEL[p.confidence_tier] ?? p.confidence_tier}
          </span>
          <span className="text-slate-400 text-xs">
            {Math.round(p.confidence * 100)}% confidence
          </span>
        </div>

        {/* Fresh badge */}
        {p.is_fresh && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Fresh — detected in the last 24 hours
          </span>
        )}

        {/* Thumbnail */}
        {p.thumbnail_url && (
          <div className="rounded overflow-hidden border border-white/8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.thumbnail_url}
              alt="SAR tile thumbnail"
              className="w-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* AMSA-specific metadata */}
        {isAmsa && (vessel || incidentDate || quantity || notes) && (
          <dl className="space-y-2 text-sm border border-sky-900/30 rounded-md bg-sky-950/10 px-3 py-3">
            {vessel && (
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">Vessel</dt>
                <dd className="text-slate-200 text-xs font-medium">{vessel}</dd>
              </div>
            )}
            {incidentDate && (
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">
                  Incident Date
                </dt>
                <dd className="text-slate-300 text-xs">{incidentDate}</dd>
              </div>
            )}
            {quantity && (
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">
                  Volume Spilled
                </dt>
                <dd className="text-slate-300 text-xs">{quantity}</dd>
              </div>
            )}
            {notes && (
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">Notes</dt>
                <dd className="text-slate-400 text-xs italic leading-relaxed">{notes}</dd>
              </div>
            )}
          </dl>
        )}

        {/* Core fields */}
        <dl className="space-y-2 text-sm">
          {!isAmsa && (
            <div>
              <dt className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">
                Detection ID
              </dt>
              <dd className="text-slate-300 font-mono text-xs break-all">{p.id}</dd>
            </div>
          )}

          <div>
            <dt className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">
              {isAmsa ? 'Incident Date (UTC)' : 'Detected (UTC)'}
            </dt>
            <dd className="text-slate-300 text-xs">{formatUtc(p.detected_at)}</dd>
          </div>

          {!isAmsa && (
            <div>
              <dt className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">
                Detected (local)
              </dt>
              <dd className="text-slate-300 text-xs">{formatLocal(p.detected_at)}</dd>
            </div>
          )}

          <div>
            <dt className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">Area</dt>
            <dd className="text-slate-300 text-xs">
              {p.area_km2 > 0 ? `${p.area_km2.toLocaleString()} km²` : 'Calculating…'}
            </dd>
          </div>

          {!isAmsa && (
            <div>
              <dt className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">
                Acquisition ID
              </dt>
              <dd className="text-slate-300 font-mono text-xs break-all">{p.acquisition_id}</dd>
            </div>
          )}

          <div>
            <dt className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">Source</dt>
            <dd className="text-slate-300 text-xs">{p.source}</dd>
          </div>

          {!isAmsa && (
            <div>
              <dt className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">Provenance</dt>
              <dd className="text-slate-300 text-xs">{p.provenance}</dd>
            </div>
          )}
        </dl>

        {/* Actions */}
        {p.raw_record_url && (
          <a
            href={p.raw_record_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center rounded border border-white/8 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            {isAmsa ? 'View on AMSA ↗' : 'View raw data ↗'}
          </a>
        )}
      </div>
    </div>
  );
}
