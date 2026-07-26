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
 * Usage: npx tsx --env-file=.env.ops scripts/check-0g-router.ts
 */
const DEFAULT_ROUTER_URL = 'https://router-api-testnet.integratenetwork.work/v1';

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

  const baseUrl = process.env.ZG_ROUTER_URL?.trim() || DEFAULT_ROUTER_URL;
  console.log(`router ${baseUrl}`);

  const balance = await get<Balance>(baseUrl, '/account/balance', key);
  if (balance) {
    console.log(`wallet  ${balance.address ?? 'unknown'}`);
    console.log(`deposit ${balance.deposit_balance ?? '?'}`);
    console.log(`credit  ${balance.credit_balance ?? '?'}`);
    console.log(`pending ${balance.pending_charge ?? '?'}`);
    console.log(`total   ${balance.total_balance ?? '?'}`);

    if ((balance.total_balance ?? '0') === '0') {
      console.log('\nBalance is zero — inference will fail with insufficient_balance.');
      console.log('Deposit at https://pc.testnet.0g.ai, then re-run this.');
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
