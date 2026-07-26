# AI tool usage

Per ETHGlobal's AI policy. Updated continuously during the build, not
reconstructed afterwards. Per-commit detail: `git log --grep="AI-Assisted"`

The Next.js + MiniKit scaffold is unmodified output of
`npx @worldcoin/create-mini-app`, a project generator rather than an AI tool.
It is isolated in the first commit so all later diffs are my own work.

| Area | Files | Tool | What the AI did | What I did |
|---|---|---|---|---|
| Project instructions | CLAUDE.md | Claude Opus | Drafted from the audited build plan | Set every constraint, made the custody and privacy calls |
| Handover | HANDOVER.md | Claude Opus | Compiled from the session's design and audit work; verified repo state and wrote the section 0 note | Made every product, scope and design decision recorded in it |
| Codespace port config | .devcontainer/devcontainer.json, next.config.ts | GitHub Copilot | Generated devcontainer.json and allowedDevOrigins Codespace detection | Verified port visibility requirement, confirmed no secrets |
| Settle payload privacy | src/app/api/session/settle/route.ts | GitHub Copilot CLI | Hardened payload rejection to block extra fields; separated settlement and HCS outcomes in response | Verified the privacy constraints and that the HCS record shape matched SessionRecord |
| Build fixes | next.config.ts, package.json | GitHub Copilot CLI | Externalized Hedera and 0G SDK from webpack; repaired lint script excluding .next output | Confirmed build was clean and no Node imports leaked to client |
| Env documentation | .env.example | GitHub Copilot CLI | Documented all env vars with usage comments and setup commands | Reviewed for accuracy and confirmed no secrets included |
| Build order docs | docs/BUILD-ORDER.md | GitHub Copilot CLI | Wrote and continuously updated the stage-by-stage build plan and status table | Made all ownership and sequencing decisions |
| Project manager agent | .claude/agents/project-manager.md | GitHub Copilot CLI | Drafted the Kanban reconciliation agent spec | Reviewed and set the evidence-based DoD rules |
| 0G Compute coach | src/ai/coach.ts, src/ai/memory.ts | Claude Sonnet | Implemented 0G provider discovery, wallet parsing, inference call, and attestation verification. Stubbed memory.ts as deliberate no-op | Chose the coach architecture, set the privacy constraints on what the model may see, verified the credential flow |
| 0G probe script | scripts/probe-0g.ts | Claude Sonnet | Wrote the live inference probe script | Used it to verify credentials and confirm a live 0G call returned |
| Coach hardening | src/ai/coach.ts | GitHub Copilot CLI | Added provider signer verification and acknowledgement check; hardened failure paths to return 'kept' | Reviewed that ambiguity-resolves-toward-user rule was correctly applied |
| Copilot instructions | .github/copilot-instructions.md | GitHub Copilot CLI | Expanded with DoomTax-specific constraints and agent etiquette | Set every constraint, reviewed for accuracy against CLAUDE.md |
| HTS streak token | src/hedera/token.ts, scripts/create-token.ts | GitHub Copilot (SWE agent) | Implemented createStreakToken, mintStreakToken; wrote the setup script | Reviewed for HTS correctness and constraint compliance |
| Per-user custody | src/identity/agentkit.ts | GitHub Copilot (SWE agent) | Implemented getOrCreateUserAccount and fundUserAccount using operator-keyed HTS accounts | Reviewed custody design, confirmed userId never touches HCS, confirmed server-only boundary |
| Settle route custody | src/app/api/session/settle/route.ts | GitHub Copilot (SWE agent + CLI) | Wired per-user account provisioning into the settle flow with operator fallback; added stakeHbar validation | Reviewed the fallback logic and confirmed the demo path stays alive |
| Streak token wiring | src/hedera/token.ts, src/app/api/session/settle/route.ts | GitHub Copilot CLI | Added ensureStreakTokenAssociated and wired mint on kept verdict; made it best-effort with graceful skip | Reviewed association logic and confirmed it is idempotent |
| CI workflow | .github/workflows/ | GitHub Copilot CLI | Added workflow_dispatch to PR-to-project workflow; fixed PAT secret reference | Verified secrets names matched repo configuration |
| Repo cleanup | src/components/*, src/auth/*, src/app/* | GitHub Copilot CLI | Removed debug console.log statements; clarified ts-expect-error; removed scaffold TODO comments | Reviewed all changes for correctness |

No AI-generated code was merged without being read and run.

