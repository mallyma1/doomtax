# Docs index

Every document in the repository, in the order a new reader should take them.
Paths are relative to this folder. The live app is at
[doomtax.vercel.app](https://doomtax.vercel.app/), and long-form notes (the
Selfie Check test log, mentor questions) live in the
[GitHub wiki](https://github.com/mallyma1/doomtax/wiki).

## 1. Start here

| Document | What it covers |
|---|---|
| [README](../README.md) | The pitch in plain English, the design decisions, the sponsor tracks and the on-chain evidence. |
| [NOT-BUILT](../NOT-BUILT.md) | Honest scope: what was cut, deferred or never started, and what does work today. |
| [ARCHITECTURE](ARCHITECTURE.md) | One diagram of how World (identity), 0G (the coach) and Hedera (settlement) fit together. |

## 2. Design decisions and specs

| Document | What it covers |
|---|---|
| [SPINE-PLAN-AUDIT](SPINE-PLAN-AUDIT.md) | Ten findings from reviewing the first settlement plan, and why the session to HashScan spine is shaped the way it is. |
| [SELFIE-CHECK-SPEC](SELFIE-CHECK-SPEC.md) | The spec for World ID liveness at claim time: flow, failure handling, privacy rules and what was built. |
| [UX-AUDIT](UX-AUDIT.md) | A rendered-app audit of the redesigned UI: what was fixed and what is known but not fixed. |

## 3. How it was built

| Document | What it covers |
|---|---|
| [BUILD-ORDER](BUILD-ORDER.md) | Who built what and in what order, split between the human, Claude and Copilot, with stage status. |
| [BUILD-REPORT](BUILD-REPORT.md) | The Copilot CLI build run of 27 July 2026: phase outcomes, commits, skipped items and review notes. |
| [HANDOVER](HANDOVER.md) | Where the project stood at handover, the one blocking decision and what is left by owner. |
| [CHANGELOG](../CHANGELOG.md) | Notable changes for users and developers, newest first. |
| [AI-USAGE](../AI-USAGE.md) | Which AI tool did what, file by file, and what was done by hand. Per-commit detail sits in `AI-Assisted:` commit trailers. |

## 4. Working rules and operations

| Document | What it covers |
|---|---|
| [CLAUDE.md](../CLAUDE.md) | The hard constraints (no Solidity, nothing identifying on HCS, no gambling language), the product shape, the design rules and the commit rules. Read it before changing anything. |
| [scripts/README](../scripts/README.md) | The operational scripts for setup, checks and fund movement. Every script that moves HBAR is a dry run unless passed `--commit`. |
| [copilot-instructions](../.github/copilot-instructions.md) and [.claude/agents](../.claude/agents/) | Standing instructions for the AI coding agents used on the repo. |

## Assets in this folder

- `qr-code-to-doomtax.png` opens DoomTax in World App. The same code ships in
  the app as `public/qr-doomtax.png`.
