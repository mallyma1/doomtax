import {
  Hbar,
  Status,
  TransactionId,
  TransactionReceipt,
  TransactionReceiptQuery,
  TransferTransaction,
} from '@hiero-ledger/sdk';
import { getHederaClient } from '../hedera/client';
import { PENDING } from '../lib/charity';

/**
 * Dash-separated form (accountId-seconds-nanos) matches the mirror node's
 * own `transaction_id` field, confirmed against a live testnet query. The
 * exact HashScan route has not been confirmed from this environment since
 * HashScan is a client-rendered SPA; eyeball the link on the first real
 * transaction run outside this container.
 */
function hashScanTransactionUrl(transactionId: string): string {
  const dashed = transactionId.includes('@')
    ? transactionId.replace('@', '-').replace('.', '-')
    : transactionId;
  return `https://hashscan.io/testnet/transaction/${dashed}`;
}

export type SettlementVerdict = 'kept' | 'slipped';

export type SettlementInput = {
  sessionId: string;
  verdict: SettlementVerdict;
  amountHbar: number;
  /** Custodial account the stake is held in for this session. */
  sourceAccountId: string;
};

export type SettlementResult =
  | { moved: true; transactionId: string; hashScanUrl: string; destinationAccountId: string }
  | { moved: false; reason: string };

function destinationFor(verdict: SettlementVerdict, sourceAccountId: string): string {
  // Kept: refund back to the session's own account. Slipped: to the
  // pending account, never directly to charity and never to the platform,
  // so a dispute or amnesty inside the appeal window is still refundable.
  return verdict === 'kept' ? sourceAccountId : PENDING.accountId;
}

async function fetchExistingReceipt(
  client: ReturnType<typeof getHederaClient>,
  transactionId: TransactionId,
): Promise<TransactionReceipt | null> {
  try {
    return await new TransactionReceiptQuery().setTransactionId(transactionId).execute(client);
  } catch {
    // No receipt yet for this transaction ID: safe to (re)submit.
    return null;
  }
}

/**
 * One atomic TransferTransaction per settlement. The transaction ID is
 * generated client-side up front so a network failure mid-submit can be
 * resolved by querying that exact ID before ever retrying, per the
 * idempotency trap in the handover. Never blind-retry.
 *
 * A "kept" verdict where the stake never left the source account (the
 * plain operator-escrow fallback, where funds only move on a slip) is a
 * no-op: nothing to refund, so nothing is submitted to the network.
 */
export async function settleSession(input: SettlementInput): Promise<SettlementResult> {
  const client = getHederaClient();
  const operatorId = process.env.HEDERA_ACCOUNT_ID!;
  const destination = destinationFor(input.verdict, input.sourceAccountId);

  if (destination === input.sourceAccountId) {
    return { moved: false, reason: 'kept verdict, stake never left the source account' };
  }

  const transactionId = TransactionId.generate(operatorId);

  const tx = new TransferTransaction()
    .setTransactionId(transactionId)
    .addHbarTransfer(input.sourceAccountId, new Hbar(-input.amountHbar))
    .addHbarTransfer(destination, new Hbar(input.amountHbar))
    .setTransactionMemo(`doomtax:${input.sessionId}:${input.verdict}`);

  let receipt: TransactionReceipt | null = null;

  try {
    const submitted = await tx.execute(client);
    receipt = await submitted.getReceipt(client);
  } catch (err) {
    // Could be a genuine failure, or a response that never reached us
    // after the network had already accepted the transaction. Check
    // before treating this as failed and before ever retrying.
    receipt = await fetchExistingReceipt(client, transactionId);
    if (!receipt) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('INSUFFICIENT_PAYER_BALANCE')) {
        throw new Error(
          `Settlement failed: operator account ${operatorId} is out of testnet HBAR. ` +
            'Fund it and retry with a fresh session, do not resubmit this transaction ID.',
        );
      }
      throw new Error(`Settlement failed for session ${input.sessionId}: ${message}`);
    }
  }

  if (receipt.status !== Status.Success) {
    throw new Error(
      `Settlement transaction ${transactionId.toString()} did not succeed: ${receipt.status.toString()}`,
    );
  }

  const idString = transactionId.toString();
  return {
    moved: true,
    transactionId: idString,
    hashScanUrl: hashScanTransactionUrl(idString),
    destinationAccountId: destination,
  };
}
