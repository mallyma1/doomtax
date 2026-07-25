import { AgentMode } from '@hashgraph/hedera-agent-kit';
import { coreAccountPlugin } from '@hashgraph/hedera-agent-kit/plugins';
import { getHederaClient } from '../src/hedera/client';

process.loadEnvFile('.env.local');

type ToolResult = { raw: Record<string, unknown> & { error?: string }; humanMessage: string };

async function createAccount(memo: string): Promise<string> {
  const client = getHederaClient();
  const context = { accountId: process.env.HEDERA_ACCOUNT_ID, mode: AgentMode.AUTONOMOUS };
  const tool = coreAccountPlugin.tools(context).find((t) => t.name === 'Create Account');
  if (!tool) throw new Error('Create Account tool not found');

  const result = (await tool.execute(client, context, {
    accountMemo: memo,
    initialBalance: 0,
  })) as ToolResult;

  if (result.raw.error) {
    throw new Error(`createAccount("${memo}") failed: ${result.raw.error}`);
  }
  const accountId = result.raw.accountId;
  if (!accountId) throw new Error(`createAccount("${memo}"): no accountId in result`);
  return accountId.toString();
}

async function main() {
  // Ensure the client is created up-front so we can close it when we're done.
  const client = getHederaClient();
  try {
    const pendingId = await createAccount('doomtax pending (holds forfeits during appeal window)');
    console.log(`PENDING_ACCOUNT_ID=${pendingId}`);

    const charityId = await createAccount('doomtax charity (testnet placeholder, no partnership)');
    console.log(`CHARITY_ACCOUNT_ID=${charityId}`);
  } finally {
    // The Hedera client keeps node handles open which keeps Node.js alive.
    // Close the client if the SDK exposes a close method so the script exits
    // promptly. Use a defensive call in case the method is not present.
    try {
      // `close` may be synchronous or return a Promise depending on SDK.
      const maybeClose = (client as any).close;
      if (typeof maybeClose === 'function') {
        const res = maybeClose.call(client);
        if (res && typeof (res as Promise<unknown>).then === 'function') {
          await res;
        }
      }
    } catch (err) {
      // Do not fail the script on close errors; just log for audit.
      console.warn('Warning: error while closing Hedera client:', err);
    }
  }
}

main().catch((err) => {
  console.error('create-accounts FAILED:', err.message ?? err);
  process.exit(1);
});
