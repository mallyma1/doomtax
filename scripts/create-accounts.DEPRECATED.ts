/**
 * ⚠️  DEPRECATED — DO NOT USE.
 *
 * This script creates accounts using the Hedera Agent Kit's "Create Account"
 * tool, which generates a fresh keypair per account but only logs the account
 * ID. The private keys are discarded the moment they are created, making every
 * account this script touches permanently unspendable.
 *
 * Use scripts/create-escrow-accounts.ts instead — it sets the operator's
 * public key explicitly so the operator can sign transfers out of the accounts.
 *
 * See HANDOVER.md section 1 for the full story.
 */
import { AgentMode } from '@hashgraph/hedera-agent-kit';
import { coreAccountPlugin } from '@hashgraph/hedera-agent-kit/plugins';
import { closeHederaClient, getHederaClient } from '../src/hedera/client';

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
  try {
    const pendingId = await createAccount('doomtax pending (holds forfeits during appeal window)');
    console.log(`PENDING_ACCOUNT_ID=${pendingId}`);

    const charityId = await createAccount('doomtax charity (testnet placeholder, no partnership)');
    console.log(`CHARITY_ACCOUNT_ID=${charityId}`);
  } finally {
    // Without this the gRPC channel pool keeps the process alive for ~45s
    // after main() resolves (same issue fixed in scripts/create-topic.ts).
    closeHederaClient();
  }
}

main().catch((err) => {
  console.error('create-accounts FAILED:', err.message ?? err);
  process.exit(1);
});
