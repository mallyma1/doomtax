import { AccountCreateTransaction, Hbar, Status } from '@hiero-ledger/sdk';
import { closeHederaClient, getHederaClient } from '../src/hedera/client';

/**
 * Creates the pending and charity accounts with the OPERATOR'S key.
 *
 * This replaces scripts/create-accounts.ts, which used the Agent Kit's
 * "Create Account" tool. That tool generates a fresh keypair per account and
 * the script only logged the account ID, so the private keys were discarded at
 * creation. The result: the operator cannot sign a transfer out of either
 * account, which makes the sweep from pending to charity impossible and leaves
 * every forfeit permanently stranded.
 *
 * That silently collapses the escrow-then-sweep design in the same way that
 * pointing pending and charity at the same ID does — appeals and amnesty become
 * promises that cannot be kept, because the money can never move again.
 *
 * Setting the operator's public key is the same custody model already used by
 * getOrCreateUserAccount() in src/identity/agentkit.ts: a real, separate
 * on-chain account that the operator can debit without storing a per-account
 * key. Honest custody, and a sweep that can actually run.
 *
 * Usage: npx tsx --env-file=.env.local scripts/create-escrow-accounts.ts
 * Then update PENDING_ACCOUNT_ID and CHARITY_ACCOUNT_ID in .env.local.
 */
async function createOperatorKeyedAccount(memo: string): Promise<string> {
  const client = getHederaClient();
  const operatorKey = client.operatorPublicKey;
  if (!operatorKey) throw new Error('Hedera client has no operator public key');

  const tx = new AccountCreateTransaction()
    .setKey(operatorKey)
    .setInitialBalance(new Hbar(0))
    .setAccountMemo(memo);

  const submitted = await tx.execute(client);
  const receipt = await submitted.getReceipt(client);

  if (receipt.status !== Status.Success) {
    throw new Error(`createOperatorKeyedAccount("${memo}") failed: ${receipt.status.toString()}`);
  }

  const accountId = receipt.accountId;
  if (!accountId) {
    throw new Error(`createOperatorKeyedAccount("${memo}"): no accountId in receipt`);
  }
  return accountId.toString();
}

async function main() {
  const pendingId = await createOperatorKeyedAccount(
    'doomtax pending (holds forfeits during appeal window)',
  );
  const charityId = await createOperatorKeyedAccount(
    'doomtax charity (testnet placeholder, no partnership)',
  );

  // These must stay distinct. Collapsing them to one ID makes a forfeit
  // irreversible the moment it lands, so appeals and amnesty stop being real.
  if (pendingId === charityId) {
    throw new Error('pending and charity resolved to the same account ID');
  }

  console.log('Set in .env.local:');
  console.log(`PENDING_ACCOUNT_ID=${pendingId}`);
  console.log(`CHARITY_ACCOUNT_ID=${charityId}`);
}

main()
  .catch((err) => {
    console.error('create-escrow-accounts failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => {
    // Close the gRPC channel pool so the process exits promptly.
    closeHederaClient();
  });
