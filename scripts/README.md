# Scripts

Operational scripts for setup, verification, and fund management.
All require `.env.local` to be populated (see `.env.example`).

**All fund-movement scripts are dry-run by default.** Pass `--commit` to
actually move HBAR.

---

## Setup — run once

| Script | Purpose |
|---|---|
| `create-topic.ts` | Create the HCS topic for session records |
| `create-token.ts` | Mint the STREAK HTS token |
| `create-escrow-accounts.ts` | Create the pending and charity escrow accounts |

> **Do not use `create-accounts.DEPRECATED.ts`** — it discards private keys,
> making the accounts it creates permanently unspendable. See the warning at
> the top of that file.

---

## Verification — run any time

| Script | Purpose |
|---|---|
| `check-hedera.ts` | Verify testnet connectivity and operator balance |
| `check-streak.ts` | Prove the kept-verdict streak token mint path |
| `check-0g.ts` | Test 0G broker inference (direct API key path) |
| `check-0g-router.ts` | Test 0G inference via the Router account |

---

## Fund management — requires `--commit`

| Script | Purpose | When |
|---|---|---|
| `sweep-charity.ts` | Move uncontested forfeits from pending → charity | After appeal window closes |
| `refund-appeals.ts` | Return contested forfeits from pending → source | After a user submits an appeal |

### Usage

```bash
# Dry run (shows what would happen, no funds move)
npx tsx --env-file=.env.local scripts/sweep-charity.ts

# Actually move funds
npx tsx --env-file=.env.local scripts/sweep-charity.ts --commit
```
