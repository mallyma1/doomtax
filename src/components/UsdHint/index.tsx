'use client';

import { fetchHbarUsdRate, formatUsd } from '@/lib/hbarUsd';
import { useEffect, useState } from 'react';

interface UsdHintProps {
  hbar: number;
  className?: string;
}

/** Displays an approximate USD value for an HBAR amount.
 *  Fades in after the rate fetch; renders nothing while loading or on error. */
export const UsdHint = ({ hbar, className }: UsdHintProps) => {
  const [usd, setUsd] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchHbarUsdRate().then((rate) => {
      if (cancelled || rate === null) return;
      setUsd(formatUsd(hbar, rate));
    });
    return () => {
      cancelled = true;
    };
  }, [hbar]);

  return (
    <span
      className={`tabular text-xs text-faint transition-opacity duration-300 min-h-[1em] ${usd ? 'opacity-100' : 'opacity-0'} ${className ?? ''}`}
      aria-hidden={!usd}
    >
      {usd ?? ''}
    </span>
  );
};
