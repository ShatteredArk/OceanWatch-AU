'use client';

interface TimeScrubberProps {
  /** Current end time as a Unix timestamp (ms) */
  value: number;
  /** Called when the user changes the scrubber */
  onChange: (timestamp: number) => void;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function formatScrubberLabel(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface LabelMark {
  label: string;
  offsetMs: number;
}

const MARKS: LabelMark[] = [
  { label: '−30d', offsetMs: THIRTY_DAYS_MS },
  { label: '−7d', offsetMs: SEVEN_DAYS_MS },
  { label: '−24h', offsetMs: ONE_DAY_MS },
  { label: 'Now', offsetMs: 0 },
];

export function TimeScrubber({ value, onChange }: TimeScrubberProps) {
  const now = Date.now();
  const min = now - THIRTY_DAYS_MS;
  const max = now;

  const percent = ((value - min) / (max - min)) * 100;
  const isAtNow = value >= now - 60_000; // within 1 min of now

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-4 pt-3"
      style={{ background: 'linear-gradient(to top, rgba(2,11,24,0.92) 60%, transparent)' }}
      role="group"
      aria-label="Time navigation"
    >
      {/* Current time label */}
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          {isAtNow ? (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          ) : (
            formatScrubberLabel(value)
          )}
        </span>
        <button
          onClick={() => onChange(now)}
          disabled={isAtNow}
          className="text-xs text-slate-500 hover:text-slate-200 disabled:opacity-30 transition-colors"
          aria-label="Jump to now"
        >
          Jump to now
        </button>
      </div>

      {/* Slider track + thumb */}
      <div className="relative">
        {/* Coloured fill behind thumb */}
        <div
          className="absolute top-1/2 left-0 -translate-y-1/2 h-1 rounded-full bg-indigo-500/60 pointer-events-none"
          style={{ width: `${percent}%` }}
        />
        <input
          type="range"
          className="scrubber-input relative z-10"
          min={min}
          max={max}
          step={60_000} // 1-minute resolution
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Select time"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={formatScrubberLabel(value)}
        />
      </div>

      {/* Axis labels */}
      <div className="mt-1.5 flex justify-between text-[10px] text-slate-600">
        {MARKS.map(({ label, offsetMs }) => {
          const ts = now - offsetMs;
          const isActive = Math.abs(value - ts) < 60 * 60 * 1000;
          return (
            <button
              key={label}
              onClick={() => onChange(offsetMs === 0 ? now : now - offsetMs)}
              className={`hover:text-slate-300 transition-colors ${isActive ? 'text-slate-300 font-semibold' : ''}`}
              aria-label={`Jump to ${label}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
