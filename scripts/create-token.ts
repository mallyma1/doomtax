import { closeHederaClient } from '../src/hedera/client';
import { createStreakToken } from '../src/hedera/token';

/**
 * One-off script: creates the HTS streak token type on testnet.
 * Run once per deployment; persist the printed token ID as
 * HEDERA_STREAK_TOKEN_ID in .env.local.
 *
 * Usage: pnpm tsx scripts/create-token.ts
 * Requires: HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY in the environment.
 */
async function main() {
  const tokenId = await createStreakToken();
  console.log(`Streak token created. Set in .env.local:`);
  console.log(`HEDERA_STREAK_TOKEN_ID=${tokenId}`);
}

main()
  .catch((err) => {
    console.error('create-token failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => {
    // Close the gRPC channel pool so the process exits promptly.
    closeHederaClient();
  });
