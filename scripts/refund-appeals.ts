import { Hbar, Status, TransferTransaction } from '@hiero-ledger/sdk';
import { closeHederaClient, getHederaClient } from '../src/hedera/client';
import { PENDING } from '../src/lib/charity';
import { listRefundable, markRefunded } from '../src/lib/sessionLedger';

/**
 * Returns appealed forfeits from the pending account to whoever staked them.
 *
 * The appeal endpoint marks a forfeit contested and the charity sweep skips it,
 * but skipping is not the same as resolving. Left there, an appeal "resolving
 * in the user's favour" would mean their money sits in escrow forever — which
 * is a slower way of keeping it. This is the half that gives it back.
 *
 * **The destination is read from the chain, not from a stored field.** The
 * ledger deliberately does not record which account staked a session: that
 * would be a durable link between a session and an identity, and we already
 * have the transfer's transaction ID, which the mirror node can resolve to the
 * account that was actually debited. Deriving beats storing when the stored
 * copy would be a new privacy liability and the derived one is authoritative.
 *
 * Dry run by default. Pass --commit to actually move funds.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/refund-appeals.ts
 *   npx tsx --env-file=.env.local scripts/refund-appeals.ts --commit
 */
const MIRROR_NODE = 'https://testnet.mirrornode.hedera.com';

type MirrorTransfer = { account: string; amount: number };

/**
 * `0.0.x@seconds.nanos` is the SDK form; the mirror node wants
 * `0.0.x-seconds-nanos` — dots preserved in the account, replaced in the
 * timestamp. A blanket `.replace('.', '-')` hits the account's first dot
 * instead and yields `0-0.x-...`, which the mirror node 404s on.
 */
function toMirrorId(transactionId: string): string {
  const [account, stamp] = transactionId.split('@');
  if (!stamp) return transactionId;
  return `${account}-${stamp.replace('.', '-')}`;
}

/**
 * Finds the account that funded a settlement.
 *
 * Fee collectors always appear as positive amounts, so the source is among the
 * negative entries. When the source also paid the transaction fee its entry is
 * net of that fee, so match on magnitude rather than equality: the funding
 * account is the one that gave up at least the stake.
 */
async function findSourceAccount(
  transactionId: string,
  amountTinybar: number,
): Promise<string | null> {
  const res = await fetch(`${MIRROR_NODE}/api/v1/transactions/${toMirrorId(transactionId)}`);
  if (!res.ok) return null;

  const body = (await res.json()) as { transactions?: { transfers?: MirrorTransfer[] }[] };
  const transfers = body.transactions?.[0]?.transfers;
  if (!transfers) return null;

  const candidates = transfers.filter(
    (t) => t.amount < 0 && Math.abs(t.amount) >= amountTinybar && t.account !== PENDING.accountId,
  );

  // Ambiguity here means we cannot say with confidence whose money this was,
  // and guessing would send a refund to the wrong account. Bail instead.
  return candidates.length === 1 ? candidates[0].account : null;
}

function formatHbar(tinybar: number): string {
  return (tinybar / 100_000_000).toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
}

async function main() {
  const commit = process.argv.includes('--commit');
  const refundable = listRefundable();

  console.log(`pending ${PENDING.accountId}`);
  console.log('');

  if (refundable.length === 0) {
    console.log('No appealed forfeits awaiting refund.');
    return;
  }

  const client = commit ? getHederaClient() : null;

  for (const record of refundable) {
    const source = await findSourceAccount(record.transactionId, record.amountTinybar);

    if (!source) {
      console.log(
        `  SKIP   ${record.sessionId}  ${formatHbar(record.amountTinybar)} HBAR  ` +
          '(could not resolve the source account from the settlement transaction)',
      );
      continue;
    }

    if (!commit || !client) {
      console.log(`  REFUND ${record.sessionId}  ${formatHbar(record.amountTinybar)} HBAR -> ${source}`);
      continue;
    }

    const amount = Hbar.fromTinybars(record.amountTinybar);
    const submitted = await new TransferTransaction()
      .addHbarTransfer(PENDING.accountId, amount.negated())
      .addHbarTransfer(source, amount)
      .setTransactionMemo(`doomtax:${record.sessionId}:refund`)
      .execute(client);

    const receipt = await submitted.getReceipt(client);
    if (receipt.status !== Status.Success) {
      console.log(`  FAIL   ${record.sessionId}  ${receipt.status.toString()}`);
      continue;
    }

    // Only after the receipt confirms. A crash before this leaves the record
    // unrefunded so the next run retries it — safe, because the sweep already
    // skips anything appealed, so nothing else can take the money meanwhile.
    const transactionId = submitted.transactionId.toString();
    markRefunded(record.sessionId, transactionId);
    console.log(`  REFUND ${record.sessionId}  ${formatHbar(record.amountTinybar)} HBAR -> ${source}`);
    console.log(`         ${transactionId}`);
  }

  if (!commit) {
    console.log('\nDry run. Re-run with --commit to move the funds.');
  }
}

main()
  .catch((err) => {
    console.error('refund-appeals failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => {
    // Without this the gRPC channel pool keeps the process alive for ~45s.
    closeHederaClient();
  });
