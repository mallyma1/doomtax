import { closeHederaClient } from '../src/hedera/client';
import { ensureStreakTokenAssociated, mintStreakToken } from '../src/hedera/token';

/**
 * Proves the kept-verdict reward path end to end against testnet.
 *
 * The settle route only reaches mintStreakToken() for an authenticated user
 * with a per-user custody account and a 'kept' verdict, which needs a phone,
 * a World App login and a live coach. This script exercises the same two
 * functions directly so the path has on-chain evidence without that setup.
 *
 * Associates the token with the target account, mints one STREAK and delivers
 * it, then prints the HashScan links.
 *
 * Usage: npx tsx --env-file=.env.local scripts/check-streak.ts [accountId]
 * Defaults to the operator account, which is also the treasury — the transfer
 * is then a self-transfer, so pass a real custody account for a full proof.
 *
 * Requires: HEDERA_ACCOUNT_ID, HEDERA_PRIVATE_KEY, HEDERA_STREAK_TOKEN_ID.
 */
async function main() {
  const tokenId = process.env.HEDERA_STREAK_TOKEN_ID;
  if (!tokenId) throw new Error('HEDERA_STREAK_TOKEN_ID is not set');

  const recipient = process.argv[2] ?? process.env.HEDERA_ACCOUNT_ID;
  if (!recipient) throw new Error('No recipient account and HEDERA_ACCOUNT_ID is not set');

  console.log(`token     ${tokenId}`);
  console.log(`recipient ${recipient}`);

  await ensureStreakTokenAssociated(recipient);
  console.log('associate OK');

  // Pseudonymous, matching what the settle route would pass. Never intention text.
  const sessionId = `probe-${Date.now()}`;
  const result = await mintStreakToken({ recipientAccountId: recipient, sessionId });

  console.log(`mint      ${result.mintTransactionId}`);
  console.log(`transfer  ${result.transferTransactionId}`);
  console.log('');
  console.log('HashScan:');
  console.log(`  https://hashscan.io/testnet/token/${tokenId}`);
}

main()
  .catch((err) => {
    console.error('streak probe FAILED:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => {
    // Without this the gRPC channel pool keeps the process alive for ~45s.
    closeHederaClient();
  });
