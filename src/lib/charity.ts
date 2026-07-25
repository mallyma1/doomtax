/**
 * Charity is an explicit placeholder for this hackathon build. No
 * partnership exists yet; mainnet target is The Giving Block, unconfirmed
 * on HBAR support. Never claim a real charity partnership in copy.
 */
export function getCharityAccountId(): string {
  const id = process.env.CHARITY_ACCOUNT_ID;
  if (!id) throw new Error('CHARITY_ACCOUNT_ID is not set');
  return id;
}

/** Operator-held pending account. Forfeits land here first, and sweep to
 * charity only after the appeal window closes, so a dispute or amnesty
 * is still refundable rather than rhetorical. */
export function getPendingAccountId(): string {
  const id = process.env.PENDING_ACCOUNT_ID;
  if (!id) throw new Error('PENDING_ACCOUNT_ID is not set');
  return id;
}

/**
 * Dash-separated form (accountId-seconds-nanos) matches the mirror node's
 * own `transaction_id` field, confirmed against a live testnet query. The
 * exact HashScan route has not been confirmed from this environment since
 * HashScan is a client-rendered SPA; eyeball the link on the first real
 * transaction run outside this container.
 */
export function hashScanTransactionUrl(transactionId: string): string {
  const dashed = transactionId.includes('@')
    ? transactionId.replace('@', '-').replace('.', '-')
    : transactionId;
  return `https://hashscan.io/testnet/transaction/${dashed}`;
}
