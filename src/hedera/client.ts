import { AccountId, Client, PrivateKey } from '@hiero-ledger/sdk';

class MissingHederaEnvError extends Error {
  constructor(missing: string[]) {
    super(
      `Missing required Hedera env var(s): ${missing.join(', ')}. ` +
        'Set them in .env.local, never in a committed file.',
    );
    this.name = 'MissingHederaEnvError';
  }
}

function parseOperatorKey(raw: string): PrivateKey {
  // Portal-issued keys arrive as either ECDSA or ED25519, DER or raw hex.
  // Try DER first since both key types share the same DER envelope, then
  // fall back to the type-specific parsers for a raw hex string.
  try {
    return PrivateKey.fromStringDer(raw);
  } catch {
    // not DER, fall through
  }
  try {
    return PrivateKey.fromStringECDSA(raw);
  } catch {
    // not ECDSA hex, fall through
  }
  return PrivateKey.fromStringED25519(raw);
}

let cachedClient: Client | null = null;

/**
 * Testnet-only Hedera client. Hard constraint: never construct a mainnet
 * client from this codebase.
 */
export function getHederaClient(): Client {
  if (cachedClient) return cachedClient;

  const network = process.env.HEDERA_NETWORK ?? 'testnet';
  if (network !== 'testnet') {
    throw new Error(
      `HEDERA_NETWORK must be "testnet", got "${network}". This project is testnet-only.`,
    );
  }

  const missing = ['HEDERA_ACCOUNT_ID', 'HEDERA_PRIVATE_KEY'].filter(
    (name) => !process.env[name],
  );
  if (missing.length > 0) {
    throw new MissingHederaEnvError(missing);
  }

  const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!);
  const privateKey = parseOperatorKey(process.env.HEDERA_PRIVATE_KEY!);

  const client = Client.forTestnet();
  client.setOperator(accountId, privateKey);

  cachedClient = client;
  return client;
}
