import { createSessionTopic } from '../src/hedera/consensus';
import { closeHederaClient } from '../src/hedera/client';

async function main() {
  const topicId = await createSessionTopic();
  console.log(`Created HCS topic: ${topicId}`);
  console.log(`Set HEDERA_HCS_TOPIC_ID=${topicId} in .env.local`);
}

main()
  .catch((err) => {
    console.error('Failed to create HCS topic:', err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => {
    closeHederaClient();
  });
