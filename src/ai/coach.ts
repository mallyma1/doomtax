import { ethers } from 'ethers';
import { createZGComputeNetworkBroker } from '@0gfoundation/0g-compute-ts-sdk';

export type CoachInput = {
  intention: string;
  artifact: string;
  foregroundTime: number;
  interruptionCount: number;
};

export type CoachVerdict = 'kept' | 'slipped';

const COACH_TIMEOUT_MS = 15_000;
const CHAT_SERVICE_TYPE = 'chatbot';
const CRITICAL_HEALTH_STATUS = 'critical';

// 0G Compute Router, testnet. Overridable so the same code points at mainnet
// or a future endpoint without a redeploy of this file's logic.
const DEFAULT_ROUTER_URL = 'https://router-api-testnet.integratenetwork.work/v1';
const DEFAULT_ROUTER_MODEL = 'qwen2.5-omni';

const SYSTEM_PROMPT =
  'You are a neutral focus session judge. ' +
  'A user committed to a specific intention and has submitted evidence. ' +
  'Judge ONLY against what they said they would do — not against a general notion of productivity. ' +
  'Reply with exactly one word: "kept" if the evidence reasonably supports the intention was fulfilled, ' +
  'or "slipped" if it clearly was not. When in doubt, reply "kept".';

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function buildUserPrompt(input: CoachInput): string {
  return [
    `Intention: ${input.intention}`,
    ``,
    `Evidence: ${input.artifact}`,
    ``,
    `Session integrity:`,
    `- Time focused: ${Math.round(input.foregroundTime)}s`,
    `- Interruptions: ${input.interruptionCount}`,
  ].join('\n');
}

function parseVerdict(raw: string): CoachVerdict {
  const lower = raw.toLowerCase();
  if (lower.includes('slipped')) return 'slipped';
  // Ambiguity always resolves toward the user (CLAUDE.md).
  return 'kept';
}

function buildWallet(): ethers.Wallet | null {
  const rawKey = process.env.ZG_PRIVATE_KEY;
  const rpcUrl = process.env.ZG_RPC_URL;
  if (!rawKey || !rpcUrl) {
    console.warn('[coach] ZG_PRIVATE_KEY or ZG_RPC_URL not set — coach disabled');
    return null;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Accept 0x-prefixed hex or base64-encoded 32-byte key.
  try {
    if (rawKey.startsWith('0x')) {
      return new ethers.Wallet(rawKey, provider);
    }
    const buf = Buffer.from(rawKey, 'base64');
    if (buf.length === 32) {
      return new ethers.Wallet('0x' + buf.toString('hex'), provider);
    }
    console.warn('[coach] ZG_PRIVATE_KEY decoded to', buf.length, 'bytes (expected 32) — coach disabled');
    return null;
  } catch (e) {
    console.warn('[coach] Could not parse ZG_PRIVATE_KEY:', (e as Error).message, '— coach disabled');
    return null;
  }
}

// Module-level broker singleton — initialised once, reused across requests.
let brokerPromise: Promise<{
  broker: Awaited<ReturnType<typeof createZGComputeNetworkBroker>>;
  providerAddress: string;
} | null> | null = null;

async function getBroker() {
  if (brokerPromise) return brokerPromise;

  brokerPromise = (async () => {
    const wallet = buildWallet();
    if (!wallet) return null;

    try {
      const broker = await createZGComputeNetworkBroker(
        wallet as unknown as Parameters<typeof createZGComputeNetworkBroker>[0],
      );
      const preferredProviderAddress = process.env.ZG_PROVIDER_ADDRESS?.trim() ?? null;
      const services = await broker.inference.listServiceWithDetail();
      const candidates = services.filter((service) => {
        if (service.serviceType !== CHAT_SERVICE_TYPE) return false;
        if (!service.teeSignerAcknowledged) return false;
        if (service.healthMetrics?.status === CRITICAL_HEALTH_STATUS) return false;
        return true;
      });

      const providerAddress =
        candidates.find(
          (service) =>
            preferredProviderAddress !== null && sameAddress(service.provider, preferredProviderAddress),
        )?.provider ??
        candidates[0]?.provider;

      if (!providerAddress) {
        console.warn(
          `[coach] No eligible 0G chatbot providers available (${candidates.length}/${services.length} passed filters)`,
        );
        return null;
      }

      // Defense-in-depth: verify acknowledgement state from the contract before first use.
      const signerStatus = await broker.inference.checkProviderSignerStatus(providerAddress);
      if (!signerStatus.isAcknowledged) {
        console.warn('[coach] Provider signer is not acknowledged — coach disabled');
        return null;
      }

      return { broker, providerAddress };
    } catch (e) {
      console.warn('[coach] Broker init failed:', (e as Error).message);
      return null;
    }
  })();

  return brokerPromise;
}

/**
 * The verdict plus whether a provider actually produced it.
 *
 * Every failure path here returns 'kept', which is correct for the user but
 * makes a dead endpoint indistinguishable from a working one. That is not
 * hypothetical: the missing 0G ledger hid behind exactly this shape for weeks,
 * with nothing but a console.warn to show for it. `answered` is what lets a
 * caller tell "the coach judged this" from "the coach never replied", without
 * changing what the user gets in either case.
 */
export type CoachOutcome = {
  verdict: CoachVerdict;
  answered: boolean;
  /** Present only when answered is false. Safe to log: never contains user text. */
  reason?: string;
};

const failOpen = (reason: string): CoachOutcome => ({ verdict: 'kept', answered: false, reason });

/**
 * Router path: 0G Compute's OpenAI-compatible endpoint.
 *
 * The broker path needs an on-chain ledger, and `broker.ledger.addLedger()`
 * enforces a 3 OG minimum that a faucet capped at 0.1/day cannot reach. The
 * Router bills a unified balance with no such floor, so it is the path that
 * can actually run.
 *
 * It returns no per-response attestation — verified against the live testnet
 * endpoint, whose only extra headers are rate-limit counters. So a verdict from
 * here is *not* TEE-verified the way the broker path's is, and documentation
 * must not claim otherwise for this mode.
 */
async function askViaRouter(input: CoachInput, apiKey: string): Promise<CoachOutcome> {
  const baseUrl = process.env.ZG_ROUTER_URL?.trim() || DEFAULT_ROUTER_URL;
  const model = process.env.ZG_ROUTER_MODEL?.trim() || DEFAULT_ROUTER_MODEL;
  const prompt = buildUserPrompt(input);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COACH_TIMEOUT_MS);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 10,
        temperature: 0,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      // The body carries a machine-readable code (insufficient_balance,
      // invalid_auth, ...). Surfacing it is the difference between a
      // five-minute fix and re-debugging the whole path.
      let detail = `status ${res.status}`;
      try {
        const body = (await res.json()) as { error?: { code?: string; message?: string } };
        if (body.error?.code) detail = `${body.error.code}: ${body.error.message ?? ''}`.trim();
      } catch {
        // Non-JSON error body; the status alone is what we have.
      }
      return failOpen(`router rejected the request (${detail})`);
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content;
    if (!raw) return failOpen('router returned no message content');

    return { verdict: parseVerdict(raw), answered: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return failOpen(`router call failed (${message})`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ask the 0G Compute coach for a verdict.
 *
 * Uses the Router when ZG_ROUTER_API_KEY is set, otherwise the broker. The two
 * are separate implementations on purpose: the broker path is the one that
 * carries TEE attestation, so it stays intact and takes over again the moment
 * a ledger can be funded.
 *
 * Defaults to 'kept' on any error, timeout, or ambiguous response —
 * ambiguity always resolves toward the user (CLAUDE.md).
 *
 * The inputs are forwarded to 0G only. They are never stored, never logged,
 * and never written to HCS.
 */
export async function askCoach(input: CoachInput): Promise<CoachOutcome> {
  const routerKey = process.env.ZG_ROUTER_API_KEY?.trim();
  if (routerKey) return askViaRouter(input, routerKey);
  return askViaBroker(input);
}

async function askViaBroker(input: CoachInput): Promise<CoachOutcome> {
  const context = await Promise.race([
    getBroker(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), COACH_TIMEOUT_MS)),
  ]);

  if (!context) return failOpen('broker unavailable (no wallet, no eligible provider, or init timed out)');

  const { broker, providerAddress } = context;

  try {
    const prompt = buildUserPrompt(input);
    const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);
    const headers = await broker.inference.getRequestHeaders(providerAddress, prompt);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), COACH_TIMEOUT_MS);

    let raw: string;
    let verified: boolean | null = null;
    try {
      const res = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          max_tokens: 10,
          temperature: 0,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Coach provider responded with status ${res.status}`);
      }

      const json = (await res.json()) as {
        id?: string;
        usage?: unknown;
        choices?: { message?: { content?: string } }[];
      };
      raw = json.choices?.[0]?.message?.content ?? '';
      // Verifiable providers return ZG-Res-Key in headers; completion id is the fallback
      // when the header is absent.
      const chatID = res.headers.get('ZG-Res-Key') ?? json.id;
      if (!chatID) {
        console.warn('[coach] Missing chat ID for attestation verification — defaulting to kept');
      } else {
        const usage = json.usage ? JSON.stringify(json.usage) : undefined;
        try {
          verified = await broker.inference.processResponse(providerAddress, chatID, usage);
        } catch (err) {
          console.warn(
            '[coach] Attestation verification failed:',
            err instanceof Error ? err.message : String(err),
            '— defaulting to kept',
          );
        }
      }
    } finally {
      clearTimeout(timer);
    }

    if (verified !== true) return failOpen('response attestation could not be verified');
    return { verdict: parseVerdict(raw), answered: true };
  } catch (e) {
    return failOpen(`inference failed (${(e as Error).message})`);
  }
}
