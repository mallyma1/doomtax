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

const SYSTEM_PROMPT =
  'You are a neutral focus session judge. ' +
  'A user committed to a specific intention and has submitted evidence. ' +
  'Judge ONLY against what they said they would do — not against a general notion of productivity. ' +
  'Reply with exactly one word: "kept" if the evidence reasonably supports the intention was fulfilled, ' +
  'or "slipped" if it clearly was not. When in doubt, reply "kept".';

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
  if (lower.includes('kept')) return 'kept';
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
      const preferredProvider = process.env.ZG_PROVIDER_ADDRESS?.trim().toLowerCase() ?? null;
      const services = await broker.inference.listServiceWithDetail();
      const candidates = services.filter((service) => {
        if (service.serviceType !== CHAT_SERVICE_TYPE) return false;
        if (!service.teeSignerAcknowledged) return false;
        if (service.healthMetrics?.status === CRITICAL_HEALTH_STATUS) return false;
        return true;
      });

      const providerAddress =
        candidates.find((service) => service.provider.toLowerCase() === preferredProvider)?.provider ??
        candidates[0]?.provider;

      if (!providerAddress) {
        console.warn('[coach] No 0G inference services available');
        return null;
      }

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
 * Ask the 0G Compute coach for a verdict.
 *
 * Defaults to 'kept' on any error, timeout, or ambiguous response —
 * ambiguity always resolves toward the user (CLAUDE.md).
 *
 * The inputs are forwarded to 0G only. They are never stored, never logged,
 * and never written to HCS.
 */
export async function askCoach(input: CoachInput): Promise<CoachVerdict> {
  const context = await Promise.race([
    getBroker(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), COACH_TIMEOUT_MS)),
  ]);

  if (!context) return 'kept';

  const { broker, providerAddress } = context;

  try {
    const prompt = buildUserPrompt(input);
    const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);
    const headers = await broker.inference.getRequestHeaders(providerAddress, prompt);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), COACH_TIMEOUT_MS);

    let raw: string;
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
      const chatID = res.headers.get('ZG-Res-Key') ?? json.id;
      const usage = json.usage ? JSON.stringify(json.usage) : undefined;
      const verified = await broker.inference.processResponse(providerAddress, chatID, usage);
      if (verified !== true) return 'kept';
    } finally {
      clearTimeout(timer);
    }

    return parseVerdict(raw);
  } catch (e) {
    console.warn('[coach] Inference failed:', (e as Error).message, '— defaulting to kept');
    return 'kept';
  }
}
