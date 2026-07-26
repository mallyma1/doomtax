import fs from 'fs';
import path from 'path';
import { AccountCreateTransaction, Hbar, TransferTransaction } from '@hiero-ledger/sdk';
import { getHederaClient } from '@/hedera/client';

/**
 * Per-user Hedera custodial account management.
 *
 * Every World App user gets a dedicated Hedera testnet account. The account's
 * signing key is the operator's own key, so the operator can debit it without
 * any per-user key storage. This is honest custody: the user has a real,
 * separate on-chain account, but World App signs World Chain — not Hedera —
 * so the operator manages the Hedera side on their behalf.
 *
 * Hard constraints:
 * - Server-only. Never import from a client component.
 * - userId is the user's World App EVM wallet address (pseudonymous). It is
 *   stored only in the local custody map, never on HCS or any public ledger.
 * - Testnet only, matching the operator client.
 */

const DATA_DIR = path.join(process.cwd(), 'data');
const CUSTODY_FILE = path.join(DATA_DIR, 'custody.json');

type CustodyRecord = { accountId: string; createdAt: number };
type CustodyMap = Record<string, CustodyRecord>;

function readCustodyMap(): CustodyMap {
  try {
    return JSON.parse(fs.readFileSync(CUSTODY_FILE, 'utf-8')) as CustodyMap;
  } catch {
    return {};
  }
}

function writeCustodyMap(map: CustodyMap): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CUSTODY_FILE, JSON.stringify(map, null, 2), 'utf-8');
}

/**
 * Returns the Hedera account ID for the given user, creating one if it does
 * not exist yet. The account is funded with zero initial balance; the caller
 * must call fundUserAccount() before the first settlement.
 *
 * @param userId - World App EVM wallet address (session.user.id). Never HCS.
 */
export async function getOrCreateUserAccount(userId: string): Promise<string> {
  const map = readCustodyMap();
  if (map[userId]) return map[userId].accountId;

  const client = getHederaClient();
  const operatorKey = client.operatorPublicKey;
  if (!operatorKey) throw new Error('Hedera client has no operator public key');

  // Create the account with the operator's public key so the operator can
  // sign transfers out of it. Initial balance is zero — funded per session.
  const tx = new AccountCreateTransaction()
    .setKey(operatorKey)
    .setInitialBalance(new Hbar(0))
    .setAccountMemo(`doomtax:user-custody:testnet`);

  const submitted = await tx.execute(client);
  const receipt = await submitted.getReceipt(client);

  const accountId = receipt.accountId;
  if (!accountId) throw new Error(`AccountCreateTransaction succeeded but returned no accountId`);

  const record: CustodyRecord = { accountId: accountId.toString(), createdAt: Date.now() };
  writeCustodyMap({ ...map, [userId]: record });

  return record.accountId;
}

/**
 * Transfers amountHbar from the operator account to the user's custody
 * account. Call this before settleSession() so the user's account has the
 * stake to spend.
 *
 * @param userAccountId - Hedera account ID from getOrCreateUserAccount().
 * @param amountHbar    - Stake amount in HBAR.
 */
export async function fundUserAccount(userAccountId: string, amountHbar: number): Promise<void> {
  const client = getHederaClient();
  const operatorId = process.env.HEDERA_ACCOUNT_ID;
  if (!operatorId) throw new Error('HEDERA_ACCOUNT_ID is not set');

  const tx = new TransferTransaction()
    .addHbarTransfer(operatorId, new Hbar(-amountHbar))
    .addHbarTransfer(userAccountId, new Hbar(amountHbar));

  const submitted = await tx.execute(client);
  await submitted.getReceipt(client);
}
