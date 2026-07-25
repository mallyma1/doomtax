import { createSessionTopic } from '../src/hedera/consensus';
import { closeHederaClient } from '../src/hedera/client';

process.loadEnvFile('.env.local');

/**
 * Run once. Creates the HCS topic that session records are written to,
 * then put the printed ID into .env.local as HEDERA_HCS_TOPIC_ID.
 *
 * Closes the cached client afterwards: without this the gRPC channel pool
 * keeps the process alive for ~45s after main() resolves (same issue fixed
 * in scripts/check-hedera.ts), which previously made this script look hung
 * and lost the printed topic ID when the caller killed it on a timeout.
 */
async function main() {
  try {
    const topicId = await createSessionTopic();
    console.log(`HCS topic created: ${topicId}`);
    console.log(`Add this to .env.local:\nHEDERA_HCS_TOPIC_ID=${topicId}`);
  } finally {
    closeHederaClient();
  }
}

main().catch((err) => {
  console.error('Topic creation FAILED:', err.message ?? err);
  process.exit(1);
});
