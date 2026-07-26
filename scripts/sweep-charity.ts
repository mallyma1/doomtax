import { Hbar, Status, TransferTransaction } from '@hiero-ledger/sdk';
import { closeHederaClient, getHederaClient } from '../src/hedera/client';
import { APPEAL_WINDOW_MS, CHARITY, PENDING } from '../src/lib/charity';
import { listHeld, listSweepable, markSwept } from '../src/lib/sessionLedger';

/**
 * Sweeps settled forfeits from the pending account to the charity account.
 *
 * This is the second half of the escrow-then-sweep design. A forfeit lands in
 * pending, never at the charity, precisely so it can still be given back —
 * once it reaches a charity it is irreversible, and appeals and amnesty become
 * promises that cannot be kept. This script is what finally closes that loop,
 * and it is the only place that may move money out of pending.
 *
 * It sweeps a forfeit only when all of these hold:
 *   - it is recorded in the session ledger
 *   - the appeal window has fully closed
 *   - it was never contested
 *   - it has not already been swept
 *
 * Anything else is held. Erring toward holding costs the placeholder charity
 * nothing; erring toward sweeping costs a user their money and our trust.
 *
 * Dry run by default. Pass --commit to actually move funds.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/sweep-charity.ts
 *   npx tsx --env-file=.env.local scripts/sweep-charity.ts --commit
 */
function formatHbar(tinybar: number): string {
  return (tinybar / 100_000_000).toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
}

/** Seconds are unreadable against a 24 hour window. Scale the unit to fit. */
function formatRemaining(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  if (seconds < 90) return `${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 90) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

async function main() {
  const commit = process.argv.includes('--commit');
  const now = Date.now();

  const sweepable = listSweepable(APPEAL_WINDOW_MS, now);
  const held = listHeld(APPEAL_WINDOW_MS, now);

  console.log(`pending  ${PENDING.accountId}`);
  console.log(`charity  ${CHARITY.accountId}${CHARITY.isPlaceholder ? ' (placeholder, no partnership)' : ''}`);
  console.log(`window   ${APPEAL_WINDOW_MS}ms`);
  console.log('');

  for (const record of held) {
    const reason =
      record.appealedAt !== null
        ? 'appealed'
        : `in window, ${formatRemaining(record.settledAt + APPEAL_WINDOW_MS - now)} left`;
    console.log(`  HOLD  ${record.sessionId}  ${formatHbar(record.amountTinybar)} HBAR  (${reason})`);
  }

  if (sweepable.length === 0) {
    console.log(`\nNothing to sweep. ${held.length} forfeit(s) held.`);
    return;
  }

  const totalTinybar = sweepable.reduce((sum, r) => sum + r.amountTinybar, 0);
  for (const record of sweepable) {
    console.log(`  SWEEP ${record.sessionId}  ${formatHbar(record.amountTinybar)} HBAR`);
  }
  console.log(`\n${sweepable.length} forfeit(s), ${formatHbar(totalTinybar)} HBAR total.`);

  if (!commit) {
    console.log('Dry run. Re-run with --commit to move the funds.');
    return;
  }

  if (PENDING.accountId === CHARITY.accountId) {
    throw new Error('pending and charity are the same account — refusing to sweep');
  }

  const client = getHederaClient();
  const amount = Hbar.fromTinybars(totalTinybar);

  // One transfer for the whole batch. The memo carries only a count, never a
  // session ID, so the public transaction cannot be used to work out which
  // individual sessions slipped.
  const submitted = await new TransferTransaction()
    .addHbarTransfer(PENDING.accountId, amount.negated())
    .addHbarTransfer(CHARITY.accountId, amount)
    .setTransactionMemo(`doomtax:sweep:${sweepable.length}`)
    .execute(client);

  const receipt = await submitted.getReceipt(client);
  if (receipt.status !== Status.Success) {
    throw new Error(`Sweep failed: ${receipt.status.toString()}`);
  }

  const transactionId = submitted.transactionId.toString();
  // Only mark swept after the receipt confirms success. A crash before this
  // point leaves the records unswept, so the next run retries them — the safe
  // direction, since a double sweep would move money that is no longer there.
  markSwept(
    sweepable.map((r) => r.sessionId),
    transactionId,
  );

  console.log(`\nSwept. ${transactionId}`);
  console.log(`https://hashscan.io/testnet/transaction/${transactionId.replace('@', '-').replace('.', '-')}`);
}

main()
  .catch((err) => {
    console.error('sweep-charity failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => {
    // Without this the gRPC channel pool keeps the process alive for ~45s.
    closeHederaClient();
  });
