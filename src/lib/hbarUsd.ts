/**
 * Client-safe HBAR→USD rate fetch via Hedera Mirror Node public REST API.
 * No @hashgraph SDK imports — safe to use in client components.
 */

let ratePromise: Promise<number | null> | null = null;

/** Fetch HBAR/USD rate from the Hedera Mirror Node exchange-rate endpoint.
 *  Returns null on any failure — UI should simply omit USD, never block or error. */
export function fetchHbarUsdRate(): Promise<number | null> {
  if (ratePromise) return ratePromise;
  ratePromise = (async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5_000);
      const res = await fetch(
        'https://mainnet-public.mirrornode.hedera.com/api/v1/network/exchangerate',
        { signal: controller.signal },
      );
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = (await res.json()) as {
        current_rate?: { cent_equivalent?: number; hbar_equivalent?: number };
      };
      const r = data.current_rate;
      if (!r?.cent_equivalent || !r?.hbar_equivalent) return null;
      return r.cent_equivalent / r.hbar_equivalent / 100;
    } catch {
      return null;
    }
  })();
  return ratePromise;
}

/** Format an HBAR amount as an approximate USD string. */
export function formatUsd(hbar: number, rate: number): string {
  const usd = hbar * rate;
  if (usd < 0.01) return '≈ <$0.01';
  return `≈ $${usd.toFixed(2)}`;
}
