# UX/UI audit

Reviewed against the product shape and design rules in `CLAUDE.md`. Findings are
ordered by what would hurt a first-time user or a judge first.

Scope: `src/app/page.tsx`, `src/app/(protected)/`, `src/components/*`,
`src/app/globals.css`. No changes made — this is the audit only.

---

## Blockers

### B1. Dark mode makes the app unreadable

`globals.css:15-20` flips `--background` to `#0a0a0a` under
`prefers-color-scheme: dark`. There are **zero `dark:` variants anywhere in
`src/`**. Every surface hardcodes light-mode colours: `text-gray-700`,
`bg-gray-50`, `border-gray-200`, and `bg-white` on the header/footer
(`PageLayout/index.tsx:21,44`).

On a phone in dark mode the body goes near-black while all body copy stays
`gray-700` on top of it — roughly 2.3:1. Most of the app is illegible. The cards
have no background of their own, so they inherit the dark body and there is no
fallback.

Fix is one of two: drop the media query and commit to light-only (fastest, and
what the World UI kit assumes), or add dark variants to every surface. Half-doing
it is worse than either.

### B2. The scaffold demo screen is still live and offers a real payment

`src/app/(protected)/home/page.tsx` is the untouched Worldcoin template:
`UserInfo`, `Verify action="test-action"`, `Pay`, `Transaction`,
`ViewPermissions`.

- `Pay` sends **0.5 WLD + 0.1 USDC to a hardcoded username `alex`**, with the
  description `"Test example payment for minikit"` (`Pay/index.tsx:22-42`).
- `Transaction` mints and transfers against a test contract via
  `@/abi/TestContract.json` on World Chain. Contract calls are optically wrong
  for the "No Solidity Allowed" track even though the ABI is not Solidity.
- The route is **not actually protected** — the redirect is commented out
  (`(protected)/layout.tsx:13-15`).

Anyone who reaches this route can send tokens to a stranger from a screen that
is not part of the product. Delete the route and the four scaffold components,
or gate them behind a dev-only flag.

### B3. The error phase is a dead end

`SessionFlow/index.tsx:506-531` renders the message and nothing else. There is
**no retry, no "start over", no way out**. The user must reload the page.

This is the worst screen to strand someone on: the copy says the stake may have
moved but could not be confirmed. Needs a retry that re-posts the settle call and
a "start a new session" escape.

Two smaller problems inside it: `errorMessage` surfaces raw server error strings
(`:336`), and the `couldHaveMoved` branch links to `https://hashscan.io/testnet`
— the bare explorer root (`:519`). Telling a worried user to "check HashScan" and
dropping them on an unfiltered homepage is not actionable; link the account or
transaction.

### B4. Session state does not survive a refresh, and the timer stops when backgrounded

All session state is `useState` (`:143-158`). Reload mid-session and the
intention, stake, and timer are silently gone.

Worse, the countdown decrements on a `setInterval` (`:205-213`). Browsers throttle
or suspend timers in hidden tabs, so the visible clock runs *slower* than
wall-clock for anyone who leaves the app — in a focus product that measures
foreground time, the timer is the one thing that must not drift. In World App a
mini app is backgrounded easily.

Compute remaining time from a persisted `startedAt` timestamp
(`sessionStorage`/`localStorage`) rather than decrementing a counter.

---

## High

### H1. The win is quieter than the loss — the core design rule is inverted

`CLAUDE.md`: *"Wins are louder than losses. The streak token mints and animates.
The forfeit is quiet."*

Today `kept` and `slipped` render the **same grey card** (`:552-690`). There is no
celebration, no streak token, no animation on a win. Meanwhile `slipped` gets
*more* UI than `kept`: the forfeit explanation, the appeal panel, the countdown,
the HCS payload. The loss is louder than the win, exactly backwards.

`Verdict: {result?.verdict}` (`:556`) also prints the raw lowercase enum. A user
who just held a commitment for 25 minutes is shown a debug log.

### H2. The intention is never shown again after it is stated

The running screen (`:447-456`) shows Session ID, Stake, and a timer. It does not
show the commitment — the one piece of text the whole product is about. The claim
screen asks *"What did you actually do?"* (`:467`) without showing what they said
they'd do, which is also the thing the verdict is judged against.

Meanwhile the raw UUID `Session ID` is displayed prominently on **five** screens.
That is developer output occupying the position the intention should hold.

### H3. The consequence is never disclosed before the user commits

The idle screen (`:412-446`) is *Start a focus session / Intention / Stake (HBAR)
/ Create session*. Nowhere does it say that slipping moves money, or where it
goes. The user learns forfeits go to a shared cause **only after settlement**
(`:561-566`).

For a commitment device this is the single most important disclosure, and it is
missing from the only screen where it would change a decision.

### H4. "Confirmation before any large jump" is not implemented

`CLAUDE.md` requires it. The stake is a bare native `<select>` with `[1, 5, 10]`
(`:429-439`) and jumping to 10 takes one tap with no confirmation. The rule is
simply not built.

Two secondary points: a native select is a weak control next to the World UI kit
for three options (chips/segmented control fits better), and nothing tells the
user these are testnet amounts with no real value.

### H5. The artifact can be submitted empty

`submitClaim` (`:289`) has no guard and the Submit button is never disabled.
An empty artifact goes straight to the coach.

Per the design rules, *"missing evidence: refund"* — so empty evidence should
resolve toward the user, not be sent for judgement. Note the appeal reason **is**
guarded (`:655`), so the three text inputs have three different validation
standards.

### H6. There is no way out of a running session

Once "Create session" is tapped there is no cancel and no back. The user is
locked to a dead-end screen for 30s in demo mode or **25 minutes** in real mode
(`session.ts:43`). Start one by mistake and you wait it out.

Amnesty only appears in the `claim` phase (`:483-492`), i.e. after the timer has
already run. But `CLAUDE.md` says *"Amnesty disarms a session before
settlement"* — which reads like it should be reachable *during* the session,
which is when someone actually realises the day has gone wrong. Right now you
must sit through the whole thing to reach the button that says you didn't have to.

Also: amnesty is a single-tap `tertiary` button that irreversibly ends the
session with **no confirmation**, while the reversible action next to it gets a
`LiveFeedback` wrapper. The protection is on the wrong button.

### H7. Ledger debug output is the default view

The complete screen renders the full HashScan URL as its own link text, the HCS
transaction ID, the HCS topic ID, and a `<pre>` JSON dump of the HCS record
(`:568-612`).

Good for a judge, wrong as the default for a user. Put it behind a "Proof"
`<details>` disclosure — the judge still gets one tap to it.

The `<pre>` has `break-all`, but the HashScan `<a>` (`:571-579`) does **not**, so
that long URL will blow out the layout horizontally on a 390px screen.

---

## Medium

### M1. The root page layout is unfinished

`src/app/page.tsx` is eight lines and has several problems at once:

- **No header, no branding.** The word "DoomTax" appears nowhere in the UI — it
  is set in `metadata` (`layout.tsx:10`) and never rendered. The user lands on a
  login button and a bare form.
- **No gap** between `<AuthButton />` and `<SessionFlow />`; they sit flush.
- **`justify-center` on a scrolling container.** `Page.Main` is
  `grow overflow-y-auto` (`PageLayout/index.tsx:34`) and the page adds
  `justify-center`. When content exceeds the viewport — which the complete state
  does easily — centred flex content overflows in both directions and the top
  becomes unreachable.
- **`AuthButton` never hides.** It auto-authenticates on mount
  (`AuthButton/index.tsx:32-44`) yet still renders "Login with Wallet" after a
  successful login, and shows nothing about who is signed in.
- **No `Page.Header`/`Page.Footer`**, so the root route gets none of the
  safe-area handling the protected layout has (`pb-[35px]`). The bottom of the
  content sits under the home indicator on iPhone.

### M2. Two of three nav tabs are dead, and the real screen has no nav

`Navigation/index.tsx:15-22` holds local `useState` and never routes. Wallet and
Profile change the highlight and nothing else. There is only one real route
behind the tabs.

And the nav renders only inside `(protected)/`, so the actual product at `/` has
no navigation at all — if a user lands on the scaffold screen they cannot get
back to DoomTax without editing the URL.

### M3. Architecture notes are rendered as product copy

Several strings explain the implementation to a judge instead of speaking to the
user:

- *"Membership stays off-chain. The collective total is derived client-side from
  known member session IDs, never from an HCS membership list."*
  (`CirclePanel/index.tsx:56-59`)
- *"This pure-code path records the dispute state only; the real refund or disarm
  from the pending account still needs the testnet-connected worker."* (`:619-622`)
- *"The separate charity sweep remains out of scope for this pure-code branch."*
  (`:682-685`) — this leaks branch-scoping language into the product.

Move these to the README. The user-facing version of the appeal copy is "contest
this and it resolves in your favour".

### M4. The Geist fonts are loaded and then overridden

`layout.tsx:4-5,27` loads Geist Sans/Mono and wires the variables into
`@theme inline` (`globals.css:11-12`), but `body { font-family: Arial, Helvetica,
sans-serif }` (`globals.css:25`) hardcodes Arial and wins. The app renders in
Arial. Change the body rule to `var(--font-geist-sans)` or delete it.

### M5. The Circle panel is the first thing a new user sees

`CirclePanel` renders on every phase including `idle`
(`SessionFlow/index.tsx:696`). On first run, directly under the start form, a
user who has never run a session sees a "Deep Work Circle" they are not in, 6
HBAR of other people's forfeits, a raw Hedera account ID
(`Account 0.0.9762856`), and the label "Placeholder charity (testnet)".

Hide it until the user has joined a circle, or at minimum until after a first
session.

### M6. Accessibility gaps

No `aria-live`, `role`, `autoFocus`, or `maxLength` appears anywhere in `src/`.

- **The countdown is not announced.** No `role="timer"`, no live region. A screen
  reader user gets no signal that a session is running or that it ended.
- **Phase transitions replace all main content** with no focus management and no
  live region, so the claim form appearing is silent.
- **`errorMessage` has no `role="alert"`** (`:514`).
- The appeal countdown (`:628`) is likewise silent while it counts down to a
  deadline that costs money.
- `text-gray-500` on `bg-gray-50` for the 12px uppercase labels
  (`CirclePanel/index.tsx:26,32`) is borderline at ~4.6:1; small text wants
  `gray-600` or darker.

### M7. Buttons are not full-width in the main flow

Every scaffold component passes `className="w-full"` to `Button`; `SessionFlow`
never does (`:442,478,489,653`). Create session / Submit session / Use amnesty
render at intrinsic width, left-aligned in their cards — inconsistent with the
rest of the app and smaller tap targets than they should be.

---

## Low

- **`LiveFeedback` with a permanently `undefined` state** (`:477`) is a no-op
  wrapper. The pending state is instead handled by swapping to a whole separate
  `submitting` screen (`:495-505`) that throws away the artifact textarea. Drive
  `state` from the phase and keep the claim screen in place.
- **The `created` phase exists only to immediately set `running`** (`:193-198`),
  costing a render pass and providing no "get ready" moment.
- **Duplicate `max-w-xl`**: `CirclePanel` declares `w-full max-w-xl` on itself
  (`CirclePanel/index.tsx:16`) while nested inside SessionFlow's `w-full
  max-w-xl` wrapper (`:694`). The inner one is dead.
- **No length limits or counter on the intention textarea** (`:418-424`); a
  single character passes `canStart` (`:392`) and is sent to the model. No
  `enterKeyHint` or `inputMode` on any field.
- **Amnesty has no stated limit.** If it is unlimited the commitment device has
  no teeth; if it is limited the UI never says so. Worth surfacing either way.

---

## Suggested order

1. B1 and B2 — one is an unreadable app, the other is a live payment button that
   is not part of the product. Both are small changes.
2. B3, B4 — the two ways a user loses a session with no recourse.
3. H1, H2, H3 — the three that make the product read like a form instead of a
   commitment device.
4. H4, H5, H6, H7, then Medium.
