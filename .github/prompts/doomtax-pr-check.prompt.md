---
description: "Use when reviewing or validating a DoomTax change before opening or updating a PR."
name: "DoomTax PR Check"
argument-hint: "What should I review?"
agent: "agent"
---

Review the current work as if preparing a DoomTax change for PR review.

Before editing:
- Read [CLAUDE.md](../../CLAUDE.md) and [.github/copilot-instructions.md](../copilot-instructions.md) and follow them.
- Keep the work scoped to the task; do not fix unrelated issues.
- Prefer minimal, surgical changes.

For this repo, enforce these constraints:
- No Solidity or contract-style code; any Hedera work must use the SDK and stay server-only.
- Never put identifying information on HCS; only use the approved session record shape.
- Use stake/commitment/pledge/forfeit language instead of bet/wager/odds/gamble.
- Keep all work testnet-only and avoid real secrets.
- When touching settlement or HCS flows, preserve the separation between settlement and HCS outcomes.

When validating:
- Check the relevant code paths, tests, and the current branch diff.
- Run the existing validation commands that fit the change:
  - `npx tsc --noEmit`
  - `pnpm build`
  - `pnpm lint`
- If the repo rules or the task imply a server/client boundary, verify that Node-only code never leaks into the client bundle.
- Summarize any risks, missing tests, or follow-up work.

At the end, provide:
1. What changed
2. Whether the repo rules were respected
3. Validation results and any remaining issues
