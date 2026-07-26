# Selfie Check spec (issue #13)

Implementation spec for `src/identity/selfieCheck.ts` and the claim-time
liveness step. Written so the design is decided **before** an agent touches it —
this feature sits on top of the money and the privacy constraints, and an
invented design here is expensive to unpick later.

**Read `CLAUDE.md` first.** Three of its hard constraints bind this feature
directly and are restated inline below. Copilot does not read `CLAUDE.md`
automatically, so nothing here may be left implicit.

Status: **§5 and §6 implemented.** §7 acceptance is outstanding and needs a
physical phone. See §10 for what was built and where it departs from §2.

---

## 1. What this is for, honestly

Selfie Check confirms **a live human is present at the moment of claim**. That
is the whole claim. It is not fraud prevention and it is not sybil resistance,
because DoomTax has nothing worth sybil-attacking: cheating means fighting
yourself to win back your own money.

What it actually buys us:

- An automated script cannot farm kept verdicts and streak tokens while nobody
  is at the device.
- The claim becomes a deliberate act by a present person, which is the same
  psychological function the rest of the product relies on.

**Where it sits: on the money, not the door.** Liveness fires at *claim*, never
at login. The README says this explicitly and it is the reason the World track
is interesting rather than decorative. Do not move it to sign-in.

### Non-goals — do not build these

- **No Sybil score.** The Developer Portal v4 verify response does not return
  one today. `docs/SELFIE-CHECK-TESTING.md` asks about it "once enabled",
  which is the correct framing. Do not add a field for it, do not branch on it,
  do not write copy claiming we use it.
- **No uniqueness or one-human-one-session enforcement.** Selfie Check's sybil
  resistance is rated "some" by World's own docs and is weaker than Orb or NFC.
  Do not build a policy on top of a signal that weak.
- **No cross-session identity linking.** See §4.
- **No blocking of any refund.** See §3. This is the one that matters most.

---

## 2. The flow

The check runs **after** the coach returns a verdict and **before** settlement,
on the claim screen only.

```
session ends
  → artifact submitted
  → coach returns verdict
  → [claim screen]
      ├─ verdict 'kept'    → Selfie Check → settle (refund + streak mint)
      └─ verdict 'slipped' → NO Selfie Check → settle (forfeit to pending)
```

> **As built, the check renders after settlement, not between the verdict and
> settlement.** The verdict is produced inside `/api/session/settle`, so the
> client cannot know it any earlier without splitting the one route that moves
> real money — not worth it for a step §3 makes explicitly non-blocking. The two
> properties that carry the design are unchanged: kept verdicts only, and the
> outcome is recorded either way. See §10.

**A slipped verdict never triggers a Selfie Check.** Making someone prove they
are a live human in order to lose money is punitive, adds friction exactly
where the user is already having a bad day, and protects nothing — there is no
incentive to fake your way into a forfeit. This asymmetry is deliberate; it is
the same reasoning as "wins are louder than losses."

---

## 3. Failure handling — the load-bearing rule

> **`CLAUDE.md`: Ambiguity always resolves toward the user. Contested session,
> failed inference, timeout, missing evidence: refund. A wrong "kept" costs
> nothing. A wrong "slipped" costs trust.**

Every Selfie Check outcome that is not an explicit success resolves **toward the
user**, meaning settlement proceeds as if the check had passed:

| Outcome | Settlement | Streak token |
|---|---|---|
| Verified | Proceeds | Minted |
| User declines / cancels | Proceeds | Minted |
| Camera denied, device unsupported | Proceeds | Minted |
| `user_presence_failed`, timeout, network error | Proceeds | Minted |
| Developer Portal 5xx, credential in Beta outage | Proceeds | Minted |

**The Selfie Check can never cost a user money or a streak.** It is recorded,
not enforced. If that reads like the feature does nothing, re-read §1: the value
is that a present human performed a deliberate act, and we can say truthfully
whether that happened. Turning it into a gate would mean a camera permission
prompt could confiscate someone's stake, which inverts the entire product.

Implementations must not add a "strict mode", a config flag, or an env var that
makes the check blocking. If a future requirement needs one, that is a design
change that goes through `CLAUDE.md`, not a parameter.

---

## 4. Privacy — what may and may not be stored

> **`CLAUDE.md`: Never write to HCS anything identifying a person or their
> content.**

**The nullifier must never reach HCS.** A nullifier is stable per app + action,
so writing it to a public permanent ledger would let anyone group every session
belonging to one person, and correlate that group with the wallet address that
funded it. That is precisely the linkage constraint 3 exists to prevent. The HCS
record keeps exactly its current five fields and gains nothing:

```
sessionId, commitmentHash, verdict, amountTinybar, timestamp
```

**Bind the proof to the session, not the person.** Use `signal: sessionId`.

- A per-session signal produces a per-session nullifier, which prevents
  replaying one proof across many claims — the actual threat.
- A stable signal (`userId`, wallet address) produces a nullifier that persists
  across every session and becomes a durable identity key. We do not need
  cross-session recognition for anything in §1, so we do not collect it.

**Storage.** Nullifiers are stored off-chain only, in the same shape and with
the same guarantees as `src/identity/agentkit.ts`'s custody map:

- File `data/selfie-checks.json`, keyed by `sessionId`.
- `data/` is already in `.gitignore`. Keep it that way.
- Atomic temp-file-then-rename write, mode `0o600`. Copy the pattern from
  `writeCustodyMap()` rather than reinventing it.
- Record shape: `{ verified: boolean, checkedAt: number, nullifier?: string }`.
  Nothing else. No image, no score, no device metadata, no raw IDKit payload.
  `nullifier` is present **only** on a verified check — as built, a declined or
  unavailable check stores no nullifier rather than an empty string, so "the
  user never proved anything" stays distinguishable from "we could not read the
  proof". This record is the only place either fact survives.

**No selfie image ever reaches our servers.** Capture and matching happen inside
World ID. We receive a zero-knowledge proof. Copy must not imply we see a face.

---

## 5. Module shape

### `src/identity/selfieCheck.ts` — server only

Mirror the existing `src/app/api/verify-proof/route.ts` verification call; do
not invent a second way to talk to the Developer Portal.

```ts
export type SelfieCheckOutcome = 'verified' | 'declined' | 'unavailable';

export type SelfieCheckRecord = {
  verified: boolean;
  checkedAt: number;
  nullifier: string;
};

/**
 * Verifies an IDKit Selfie Check proof against the Developer Portal and
 * records the outcome against the session. Never throws for a failed check —
 * a rejected proof is a normal 'declined' outcome, not an error, because
 * settlement proceeds either way (see spec §3).
 */
export async function recordSelfieCheck(
  sessionId: string,
  idkitResponse: unknown,
): Promise<SelfieCheckOutcome>;

/** Reads the stored outcome. Returns null if the session was never checked. */
export function getSelfieCheck(sessionId: string): SelfieCheckRecord | null;
```

- `export const runtime = 'nodejs'` on any route importing this. It reads
  `RP_ID` and touches the filesystem; it must never reach the client bundle.
- Never import this from a client component. `pnpm build` is the gate that
  catches it (see `SPINE-PLAN-AUDIT.md` finding #1).

### `src/components/SelfieCheck/index.tsx` — client

Model it on `src/components/Verify/index.tsx`, which already does the full
round trip: `POST /api/rp-signature` → `IDKit.request(...)` →
`pollUntilCompletion()` → `POST` to a backend verify route.

Two differences from `Verify`:

```ts
import { IDKit, selfieCheckLegacy } from '@worldcoin/idkit';

const request = await IDKit.request({
  app_id: process.env.NEXT_PUBLIC_APP_ID as `app_${string}`,
  action: SELFIE_CHECK_ACTION,
  rp_context: rpContext,
  allow_legacy_proofs: true,
}).preset(selfieCheckLegacy({ signal: sessionId }));
```

- Preset is `selfieCheckLegacy`, **not** `orbLegacy`. Verified present in the
  installed `@worldcoin/idkit@4.2.1` exports.
- `signal` is the `sessionId` (see §4).
- Inside World App, IDKit uses the native transport automatically — no QR, no
  transport config. The same component works on web with the QR fallback.
- `require_user_presence` is **not** needed. It is a request-level liveness flag
  for *other* credentials; Selfie Check is already a liveness credential.

### `/api/session/selfie-check` — new route

Thin: takes `{ sessionId, rp_id, idkitResponse }`, validates `rp_id` against
`process.env.RP_ID` exactly as `verify-proof` does, calls `recordSelfieCheck()`,
returns `{ outcome }`. Never returns the nullifier to the client.

---

## 6. Configuration

- **New action required.** Do not reuse `WORLD_ACTION_ID` — that action is bound
  to `orbLegacy` via the existing `Verify` component, and World's docs are
  explicit that changing the credential means a new action. Create
  `doomtax-claim` in the Developer Portal and add `WORLD_SELFIE_ACTION_ID` to
  `.env.example` and `.env.local`.
- **Selfie Check is Beta.** It may need explicit enablement on the app in the
  Developer Portal. Confirm before assuming an integration bug — see #40.
- **Credential validity is 90 days.** Irrelevant to us because we never rely on
  a prior enrollment, but it explains why a returning tester may get a full
  enrollment flow instead of a quick face match.

### Demo mode

`DEMO_MODE` (from `src/lib/session.ts`, the single source of truth — do not
re-test the env var) **skips the Selfie Check entirely** and settles directly.
The submission video and any judge running `pnpm dev` in a browser must not need
a phone in hand to see the flow complete.

---

## 7. Testing

`docs/SELFIE-CHECK-TESTING.md` is the World track deliverable and it is a
template with empty bullets. **Fill it during integration, not retrospectively**
— that instruction is in the file and it is the whole point of the artifact.

Sandbox limitations that will otherwise cost debugging time:

- Sandbox apps are not published to the app stores, so the **Cold** and
  **Semi-cold** journeys cannot be exercised exactly as they will behave in
  production. Install deep links will not route to a store listing.
- **iOS Semi-cold is knowingly broken upstream**: if a user taps "Sign in"
  rather than "Sign up" mid-flow there is no path to enter the invite code, and
  they must restart from a fresh QR or deep link. Android is fine. Do not file
  this as our bug.
- Invite-code presentation differs by platform in the Cold flow.

Minimum acceptance:

1. Hot path on a physical Android phone inside World App: kept verdict → Selfie
   Check → settle, with the streak token minted.
2. Decline the check on the same path and confirm settlement **still proceeds**
   and the streak still mints. This is the §3 test and it is the one that
   actually matters.
3. Slipped verdict never shows the Selfie Check step at all.
4. `data/selfie-checks.json` contains only the three specified fields.
5. The HCS message for a checked session is byte-identical in shape to one from
   an unchecked session.

---

## 8. Definition of done

Evidence-based, per `.claude/agents/project-manager.md` — "a 0-byte file is not
done, it worked locally is not done":

- [x] `src/identity/selfieCheck.ts` implements §5 and is non-empty
- [x] `src/components/SelfieCheck/index.tsx` renders on the claim screen for
      kept verdicts only
- [x] `/api/session/selfie-check` verifies server-side and stores off-chain
- [x] `WORLD_SELFIE_ACTION_ID` documented in `.env.example`
- [x] `npx tsc --noEmit`, `pnpm build`, `pnpm lint` all clean
- [ ] All five acceptance checks in §7 run on a physical device, with results
      written into `docs/SELFIE-CHECK-TESTING.md`
- [x] A grep confirms no nullifier reaches `src/hedera/consensus.ts` —
      `grep -rn nullifier src/hedera/ src/agent/ src/lib/` returns 0 hits

## 9. Ownership

**Not Copilot-safe end to end.** The code in §5 is pure and spec-bound, but §7
needs a physical phone, a World App account and Developer Portal access, so it
cannot be signed off by a sandboxed agent. Split it: Copilot may build §5 and
§6 against this document; the acceptance run in §7 is Mally + Claude.

**Timing: this is post-submission.** It was correctly declared won't-this-cycle
on #13. This spec exists so that decision is reversible cheaply, not to reopen
it under deadline.

---

## 10. As built

Landed by Claude, not Copilot — §5–6 were Copilot-safe but the work happened in
a session that already had the context.

| Piece | File |
|---|---|
| Server module | `src/identity/selfieCheck.ts` |
| Route | `src/app/api/session/selfie-check/route.ts` |
| Client component | `src/components/SelfieCheck/index.tsx` |
| Wiring | `src/components/SessionFlow/index.tsx`, action passed from `src/app/page.tsx` |

**Three decisions the spec left open.**

1. **Ordering.** The check renders after settlement rather than before it —
   see the note in §2. The alternative was splitting `/api/session/settle`,
   which is the proven, money-moving path on the Hedera track.
2. **`WORLD_SELFIE_ACTION_ID` stays server-read.** `src/app/page.tsx` is a
   server component, so it reads the action and passes it down as a prop. No
   `NEXT_PUBLIC_` twin, and an unset value hides the step rather than breaking
   the claim.
3. **A decline is posted, not dropped.** The component sends a null proof when
   the user cancels, so the route records `verified: false`. Dropping it would
   leave "chose not to" indistinguishable from "never got there", and §1's
   entire value is being able to say truthfully which happened.

**Verified locally, without a phone.** `tsc --noEmit`, `pnpm build` and
`pnpm lint` are clean, and the route is registered in the build output. A probe
against the **live** Developer Portal confirmed the round trip: a null proof
records `declined`, a well-formed but bogus proof is rejected by the Portal and
also records `declined`, an unchecked session reads back `null`, and
`data/selfie-checks.json` lands at mode `600` carrying only the specified
fields. Wrong `rp_id` and missing `sessionId` both 400.

**What none of that proves:** no real Selfie Check credential has ever been
issued or verified here. Every path exercised so far is a rejection path. §7 is
the acceptance run and it still needs a physical Android phone inside World App,
plus the Beta credential enabled on the app in the Developer Portal. Until then
this is implemented and unproven — the same distinction the 0G coach sat behind
for weeks.
