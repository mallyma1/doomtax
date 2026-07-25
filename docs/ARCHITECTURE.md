
┌─────────────────────────────────────────────────────────────────┐
│  World Mini App (Next.js 15 + MiniKit)                          │
│  Set intention · Timer · Submit artifact · Claim · Appeal        │
└───────────────┬─────────────────────────────────────────────────┘
                │
    ┌───────────▼───────────┐   IDENTITY (World)
    │ Selfie Check at CLAIM │   liveness at the one moment with a
    │                       │   financial incentive to cheat
    └───────────┬───────────┘
                │
    ┌───────────▼────────────────────┐   INTELLIGENCE (0G)
    │ Focus Coach on 0G Compute      │   TEE-sealed, attention data stays private
    │  · verdict: kept / slipped     │
    │  · supportive coaching message │
    │ Encrypted history on 0G Storage│   user holds the key; this is also the
    └───────────┬────────────────────┘   paid tier of the product
                │
    ┌───────────▼──────────────────────────────┐  VALUE + TRUTH (Hedera)
    │ Settlement Agent (Hedera Agent Kit)      │
    │  · ScheduleCreate + setWaitForExpiry     │  forfeit pre-armed and dated
    │  · kept  → ScheduleDelete, refund        │  finishing disarms it
    │  · slip  → fires to PENDING account      │
    │  · sweep pending → charity after appeal  │  makes appeals reversible
    │  · HTS: streak token                     │
    │  · HCS: hash + verdict + payout only     │
    └──────────────────────────────────────────┘

**Session lifecycle:** start (intention + scheduled transfer armed + consent hash
to HCS) → during (Page Visibility API counts foreground time and interruptions)
→ end (opt-in artifact: a paragraph, commit hash, photo of notes) → claim (Selfie
Check **in parallel with** inference) → verdict → settle → appeal window → sweep.

**The evidence position:** we do not need strong evidence because we deliberately
bias every ambiguous case toward the user. Say it out loud: *we do not need to
surveil you, because we are not trying to catch you.* We are a webview with no OS
access, so OS-level monitoring is not on the table at all.
