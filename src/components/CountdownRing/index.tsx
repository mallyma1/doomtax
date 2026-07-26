'use client';

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface CountdownRingProps {
  /** Seconds remaining. */
  remaining: number;
  /** 0 to 1. */
  progress: number;
  /** Shown under the digits, e.g. "of 50 minutes". */
  caption: string;
  /** Amber while value is at stake, neutral once it is not. */
  atStake?: boolean;
}

const SIZE = 232;
const STROKE = 3;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The session clock, as a body in orbit.
 *
 * The arc is time remaining, so it depletes toward the commitment, and a marker
 * rides its leading edge. The hairline ring and glowing core follow the Orbit
 * reference: the light is the thing that carries state, not the stroke weight.
 */
export const CountdownRing = ({
  remaining,
  progress,
  caption,
  atStake = true,
}: CountdownRingProps) => {
  const stroke = atStake ? 'var(--accent)' : 'var(--muted)';
  const remainingArc = CIRCUMFERENCE * (1 - progress);

  // Marker position on the ring. Starts at 12 o'clock and sweeps clockwise.
  const angle = progress * 2 * Math.PI - Math.PI / 2;
  const markerX = SIZE / 2 + RADIUS * Math.cos(angle);
  const markerY = SIZE / 2 + RADIUS * Math.sin(angle);

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: SIZE, height: SIZE }}
      role="timer"
      aria-live="off"
    >
      {/* Ambient light behind the digits, held well inside the ring. */}
      <div
        className="absolute rounded-full"
        style={{
          width: SIZE * 0.62,
          height: SIZE * 0.62,
          background: atStake
            ? 'radial-gradient(circle, rgba(245,158,11,0.16) 0%, transparent 68%)'
            : 'radial-gradient(circle, rgba(155,149,163,0.10) 0%, transparent 68%)',
        }}
        aria-hidden="true"
      />

      <svg width={SIZE} height={SIZE} className="absolute" aria-hidden="true">
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--border)"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={stroke}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE - remainingArc}
            style={{ transition: 'stroke-dashoffset 300ms linear' }}
          />
        </g>
        {progress > 0 && progress < 1 && (
          <circle cx={markerX} cy={markerY} r={4} fill={stroke} />
        )}
      </svg>

      <div className="relative flex flex-col items-center">
        <span className="tabular text-[60px] font-semibold leading-none tracking-tight text-foreground">
          {formatClock(remaining)}
        </span>
        <span className="mono-caption mt-3 text-xs uppercase tracking-widest text-faint">
          {caption}
        </span>
      </div>
    </div>
  );
};
