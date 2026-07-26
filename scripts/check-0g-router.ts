/**
 * Reports the 0G Compute Router account: deposit balance and API keys.
 *
 * Use this to confirm a deposit landed before blaming the coach. An unfunded
 * Router returns `insufficient_balance`, which askCoach() resolves to 'kept' —
 * correct for the user, but it means an empty balance and a working coach look
 * the same from the app.
 *
 * **Reads the management key from .env.ops, not .env.local.** Next loads
 * .env.local into the app runtime, and the app must never hold a credential
 * that can provision or revoke keys — it only ever needs the sk- key to call
 * /chat/completions. 0G's own guidance is to ship sk- to the runtime and keep
 * mk- for dashboards and CI.
 *
 * This script is Router-only: point it at a `/v1` Router base URL, not a
 * provider-scoped `compute-network-*` endpoint.
 *
 * Usage: npx tsx --env-file=.env.ops scripts/check-0g-router.ts
 */
import {
  getZeroGNetwork,
  getZeroGPortalUrl,
  getZeroGRouterBaseUrl,
} from '../src/ai/zero-g';

type Balance = {
  address?: string;
  deposit_balance?: string;
  credit_balance?: string;
  pending_charge?: string;
  total_balance?: string;
};

type ApiKeyList = {
  data?: { name?: string; key_preview?: string; status?: string; used?: string; revoked?: boolean }[];
};

async function get<T>(baseUrl: string, path: string, key: string): Promise<T | null> {
  const res = await fetch(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) {
    console.error(`  ${path} -> ${res.status}`);
    return null;
  }
  return (await res.json()) as T;
}

async function main() {
  const key = process.env.ZG_ROUTER_MANAGEMENT_KEY?.trim();
  if (!key) {
    throw new Error(
      'ZG_ROUTER_MANAGEMENT_KEY is not set. Run with `--env-file=.env.ops` (not .env.local).',
    );
  }

  const baseUrl = getZeroGRouterBaseUrl();
  const network = getZeroGNetwork();
  console.log(`router ${baseUrl}`);
  console.log(`network ${network}`);

  const balance = await get<Balance>(baseUrl, '/account/balance', key);
  if (balance) {
    console.log(`wallet  ${balance.address ?? 'unknown'}`);
    console.log(`deposit ${balance.deposit_balance ?? '?'}`);
    console.log(`credit  ${balance.credit_balance ?? '?'}`);
    console.log(`pending ${balance.pending_charge ?? '?'}`);
    console.log(`total   ${balance.total_balance ?? '?'}`);

    if ((balance.total_balance ?? '0') === '0') {
      const portalUrl = getZeroGPortalUrl(network);
      console.log('\nBalance is zero — inference will fail with insufficient_balance.');
      if (portalUrl) {
        console.log(`Deposit at ${portalUrl}, then re-run this.`);
      } else {
        console.log('Set ZG_NETWORK=mainnet or testnet so this script can point at the right 0G console.');
      }
    }
  }

  const keys = await get<ApiKeyList>(baseUrl, '/api-keys', key);
  if (keys?.data?.length) {
    console.log('\napi keys:');
    for (const k of keys.data) {
      const state = k.revoked ? 'revoked' : (k.status ?? 'unknown');
      console.log(`  ${k.key_preview ?? '?'}  ${k.name ?? '(unnamed)'}  ${state}  used=${k.used ?? '0'}`);
    }
  }
}

main().catch((err) => {
  console.error('check-0g-router failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
