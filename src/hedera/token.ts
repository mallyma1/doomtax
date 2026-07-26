import {
  AccountId,
  PrivateKey,
  Status,
  TokenAssociateTransaction,
  TokenCreateTransaction,
  TokenMintTransaction,
  TokenSupplyType,
  TokenType,
  TransferTransaction,
} from '@hiero-ledger/sdk';
import { getHederaClient } from './client';

// Mirrors the private helper in client.ts: DER, ECDSA hex, and ED25519 hex
// all handled. Token operations need the raw key object to set as supplyKey.
function parseOperatorKey(raw: string): PrivateKey {
  try {
    return PrivateKey.fromStringDer(raw);
  } catch {
    // not DER, fall through
  }
  try {
    return PrivateKey.fromStringECDSA(raw);
  } catch {
    // not ECDSA hex, fall through
  }
  return PrivateKey.fromStringED25519(raw);
}

/**
 * Run once to create the streak token type on HTS.
 * Persist the returned token ID as HEDERA_STREAK_TOKEN_ID.
 *
 * Follows the same structural shape as createSessionTopic() in consensus.ts
 * but uses TokenCreateTransaction directly from @hiero-ledger/sdk.
 *
 * Hard constraint: no user identity or personal data in the token metadata.
 * The token is a public, permanent record on testnet.
 */
export async function createStreakToken(): Promise<string> {
  const client = getHederaClient();
  const operatorId = process.env.HEDERA_ACCOUNT_ID!;
  const operatorKey = parseOperatorKey(process.env.HEDERA_PRIVATE_KEY!);

  const tx = new TokenCreateTransaction()
    .setTokenName('DoomTax Streak')
    .setTokenSymbol('STREAK')
    .setDecimals(0)
    .setInitialSupply(0)
    .setTreasuryAccountId(AccountId.fromString(operatorId))
    .setSupplyKey(operatorKey)
    .setSupplyType(TokenSupplyType.Infinite)
    .setTokenType(TokenType.FungibleCommon)
    .setTokenMemo('doomtax:streak-counter, testnet only');

  const submitted = await tx.execute(client);
  const receipt = await submitted.getReceipt(client);

  if (receipt.status !== Status.Success) {
    throw new Error(`createStreakToken failed: ${receipt.status.toString()}`);
  }

  const tokenId = receipt.tokenId;
  if (!tokenId) {
    throw new Error('createStreakToken: transaction succeeded but no tokenId in receipt');
  }
  return tokenId.toString();
}

export type MintStreakTokenInput = {
  /**
   * Hedera account ID of the session owner.
   * Must already have associated with HEDERA_STREAK_TOKEN_ID via
   * TokenAssociateTransaction before this is called.
   */
  recipientAccountId: string;
  /** Pseudonymous session ID used in the transaction memo. Never intention text. */
  sessionId: string;
};

export type MintStreakTokenResult = {
  mintTransactionId: string;
  transferTransactionId: string;
};

/**
 * Mints one streak token and delivers it to the recipient on a kept session.
 *
 * HTS always mints to the treasury first, so this is two steps:
 *   1. TokenMintTransaction — adds 1 to the operator treasury
 *   2. TransferTransaction  — moves 1 from treasury to the recipient
 *
 * Hard constraint: award this only on a kept verdict. The caller is
 * responsible for that guard; this function does not check the verdict.
 *
 * Hard constraint: no personal data in memos. The session ID is a
 * pseudonymous UUID; it never identifies the user or carries intention text.
 */
export async function mintStreakToken(input: MintStreakTokenInput): Promise<MintStreakTokenResult> {
  const tokenId = process.env.HEDERA_STREAK_TOKEN_ID;
  if (!tokenId) throw new Error('HEDERA_STREAK_TOKEN_ID is not set');

  const client = getHederaClient();
  const operatorId = process.env.HEDERA_ACCOUNT_ID!;

  // Step 1: mint one token to the operator treasury.
  const mintTx = new TokenMintTransaction().setTokenId(tokenId).setAmount(1);

  const mintSubmitted = await mintTx.execute(client);
  const mintReceipt = await mintSubmitted.getReceipt(client);

  if (mintReceipt.status !== Status.Success) {
    throw new Error(
      `mintStreakToken: mint step failed for session ${input.sessionId}: ${mintReceipt.status.toString()}`,
    );
  }

  const mintTransactionId = mintSubmitted.transactionId.toString();

  // Step 2: transfer the minted token from treasury to recipient.
  const transferTx = new TransferTransaction()
    .addTokenTransfer(tokenId, operatorId, -1)
    .addTokenTransfer(tokenId, input.recipientAccountId, 1)
    .setTransactionMemo(`doomtax:${input.sessionId}:streak`);

  const transferSubmitted = await transferTx.execute(client);
  const transferReceipt = await transferSubmitted.getReceipt(client);

  if (transferReceipt.status !== Status.Success) {
    throw new Error(
      `mintStreakToken: transfer step failed for session ${input.sessionId}: ${transferReceipt.status.toString()}`,
    );
  }

  return {
    mintTransactionId,
    transferTransactionId: transferSubmitted.transactionId.toString(),
  };
}

/**
 * Associates HEDERA_STREAK_TOKEN_ID with the given account if not already
 * associated. Call this before the first mintStreakToken() for a new account.
 *
 * Since per-user accounts are created with the operator's key, the operator
 * can sign this transaction on the user's behalf — no separate user key needed.
 *
 * No-ops silently if HEDERA_STREAK_TOKEN_ID is not set (token not yet created).
 */
export async function ensureStreakTokenAssociated(accountId: string): Promise<void> {
  const tokenId = process.env.HEDERA_STREAK_TOKEN_ID;
  if (!tokenId) return;

  const client = getHederaClient();

  const tx = new TokenAssociateTransaction()
    .setAccountId(AccountId.fromString(accountId))
    .setTokenIds([tokenId]);

  try {
    const submitted = await tx.execute(client);
    const receipt = await submitted.getReceipt(client);
    if (receipt.status !== Status.Success) {
      throw new Error(`ensureStreakTokenAssociated failed: ${receipt.status.toString()}`);
    }
  } catch (err) {
    // TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT is fine — idempotent
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT')) throw err;
  }
}
