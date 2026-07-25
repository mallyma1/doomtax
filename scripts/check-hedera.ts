import { AccountBalanceQuery, Client } from '@hiero-ledger/sdk';

/**
 * Transport check only, no operator key. Confirms this environment can
 * reach Hedera testnet consensus nodes over gRPC before anything else is
 * built on top of @hiero-ledger/sdk.
 */
async function main() {
  const client = Client.forTestnet();
  const balance = await new AccountBalanceQuery()
    .setAccountId('0.0.2')
    .execute(client);
  console.log(`gRPC transport OK. 0.0.2 balance: ${balance.hbars.toString()}`);
}

main().catch((err) => {
  console.error('gRPC transport FAILED:', err.message ?? err);
  process.exit(1);
});
