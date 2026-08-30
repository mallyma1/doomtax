import { ethers } from 'ethers';
import { createRequire } from 'node:module';
import type { createZGComputeNetworkBroker as CreateBroker } from '@0gfoundation/0g-compute-ts-sdk';
import { getZeroGNetwork } from '../src/ai/zero-g';

/**
 * Loaded through createRequire rather than a static import.
 *
 * The SDK's ESM entry re-exports named bindings out of a CommonJS chunk, which
 * tsx's loader cannot resolve — `pnpm exec tsx scripts/check-0g.ts` died with
 * "does not provide an export named 'C'" before running a line of this file.
 * Plain Node and Next's server runtime both handle it, so the app is
 * unaffected and only this script needed the CommonJS entry. The type import
 * above keeps the signature; only the runtime value comes through require.
 */
const require_ = createRequire(import.meta.url);
const { createZGComputeNetworkBroker } = require_(
  '@0gfoundation/0g-compute-ts-sdk',
) as { createZGComputeNetworkBroker: typeof CreateBroker };

/**
 * Live probe for the 0G Compute coach path (#11).
 *
 * The coach in src/ai/coach.ts fails safe: every error returns 'kept', so a
 * dead endpoint is indistinguishable from a working one. This script removes
 * that ambiguity by failing loudly at each step, and it is the only place
 * that provisions the 0G ledger the coach needs.
 *
 * Spends OG on first run (ledger creation). Read-only afterwards.
 */

/**
 * Initial ledger balance in OG. 3 is the network-enforced minimum, not a
 * choice — addLedger reverts below it. Far more than a verdict needs
 * (~10 output tokens), but it is the floor.
 */
const LEDGER_BALANCE_OG = 3;
const TIMEOUT_MS = 30_000;

function buildWallet(): ethers.Wallet {
  const rawKey = process.env.ZG_PRIVATE_KEY;
  const rpcUrl = process.env.ZG_RPC_URL;
  if (!rawKey) throw new Error('ZG_PRIVATE_KEY is not set');
  if (!rpcUrl) throw new Error('ZG_RPC_URL is not set');

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  if (rawKey.startsWith('0x')) return new ethers.Wallet(rawKey, provider);

  const buf = Buffer.from(rawKey, 'base64');
  if (buf.length !== 32) {
    throw new Error(`ZG_PRIVATE_KEY decoded to ${buf.length} bytes, expected 32`);
  }
  return new ethers.Wallet('0x' + buf.toString('hex'), provider);
}

async function main() {
  const wallet = buildWallet();
  const address = await wallet.getAddress();
  const balance = await wallet.provider!.getBalance(address);
  const network = getZeroGNetwork();
  console.log(`wallet   ${address}`);
  console.log(`network  ${network}`);
  console.log(`balance  ${ethers.formatEther(balance)} OG`);

  const broker = await createZGComputeNetworkBroker(
    wallet as unknown as Parameters<typeof createZGComputeNetworkBroker>[0],
  );

  // Step 1: the ledger. Without it getRequestHeaders() throws on every call
  // and the coach silently degrades to 'kept'.
  try {
    const ledger = await broker.ledger.getLedger();
    console.log(`ledger   exists, balance ${ledger.totalBalance}`);
  } catch {
    console.log(`ledger   missing — creating with ${LEDGER_BALANCE_OG} OG`);
    await broker.ledger.addLedger(LEDGER_BALANCE_OG);
    const ledger = await broker.ledger.getLedger();
    console.log(`ledger   created, balance ${ledger.totalBalance}`);
  }

  // Step 2: pick a provider. coach.ts takes services[0] unfiltered, which
  // works only by luck — the list contains image models too.
  const services = await broker.inference.listService();
  console.log(`services ${services.length} available`);
  for (const s of services) {
    console.log(`  ${s.provider}  ${s.model}  (${s.serviceType})`);
  }

  const chat = services.find(
    (s) => s.serviceType === 'chatbot' || /llama|qwen(?!-image)|deepseek|gpt/i.test(s.model),
  );
  if (!chat) throw new Error('No chat-capable service in the provider list');
  console.log(`chosen   ${chat.provider} (${chat.model})`);

  // Step 3: a real inference call, shaped exactly like the coach's.
  const { endpoint, model } = await broker.inference.getServiceMetadata(chat.provider);
  const headers = await broker.inference.getRequestHeaders(chat.provider);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are a neutral focus session judge. Judge ONLY against what the user said they would do. Reply with exactly one word: "kept" or "slipped". When in doubt, reply "kept".',
          },
          {
            role: 'user',
            content:
              'Intention: write the README submission section\n\nEvidence: wrote 400 words covering both demo and live coach modes\n\nSession integrity:\n- Time focused: 1500s\n- Interruptions: 1',
          },
        ],
        max_tokens: 10,
        temperature: 0,
      }),
      signal: controller.signal,
    });

    const text = await res.text();
    console.log(`http     ${res.status} ${res.statusText}`);
    if (!res.ok) throw new Error(`Inference returned ${res.status}: ${text}`);

    const json = JSON.parse(text) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? '';
    console.log(`reply    ${JSON.stringify(raw)}`);
    console.log(`verdict  ${raw.toLowerCase().includes('slipped') ? 'slipped' : 'kept'}`);
  } finally {
    clearTimeout(timer);
  }

  console.log('\n0G inference OK — a live call completed end to end.');
}

main().catch((err) => {
  console.error('\n0G probe FAILED:', err.message ?? err);
  process.exit(1);
});
