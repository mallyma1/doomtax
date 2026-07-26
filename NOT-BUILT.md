# What we didn't build

An honest account of scope that was cut, deferred, or never started. Written for
ETHGlobal Lisbon judges and future contributors. The things below either didn't
make the submission window or were deliberately out of scope for v1.

---

## Browser extension

The original product concept included a Chrome / Edge extension that would run
alongside the World App version: detect doomscrolling patterns, track active-tab
time, and surface a "start a session" prompt when you've been drifting. It would
have used the Page Visibility API and `chrome.tabs` to build the same integrity
signals (foreground time, interruption count) that the mobile flow collects via
the browser's own Visibility API.

**Why it didn't ship:** The World App track was the primary submission target,
and getting the mobile session flow, Hedera settlement, and 0G coach all working
end-to-end was already a full build. The extension would have needed its own
packaging, a separate manifest, and a cross-origin messaging layer between the
extension and the Next.js API. We scoped it out early and never started it.

---

## Desktop / open-web path

The app is built as a World Mini App. It works in the browser at the live URL,
but the World App connection — login via MiniKit, Selfie Check, World ID
verification — only fully activates inside World App. A proper desktop path
would have an alternative auth flow (e.g. wallet connect or email) and a UI that
doesn't assume a 390px mobile viewport.

---

## Long-memory coach (paid tier)

`CLAUDE.md` specifies a paid tier backed by 0G Storage: the coach builds a
persistent model of your focus history across sessions, spots patterns ("you
always slip after 3 pm on Wednesdays"), and gives richer feedback. The free tier
is implemented — it returns a verdict. The storage layer and per-user session
history are not.

---

## UI/UX — committed late

Most of the visual design landed in the final hours of the build. Earlier
commits focused on the Hedera settlement spine, 0G compute coach, and World ID
flows. The UI audit, animation layer (`animate-fade-up`, `animate-glow-pulse`,
verdict washes, bottom-sheet transitions), and the redesigned StakeForm and
Verdict screens were all merged close to the submission deadline. They work, but
they weren't iterated on — there was no design round-trip, no user testing, and
no mobile preview pass before commit.

---

## Accountability circles — UI only

The `CirclePanel` component renders a demo circle with hardcoded data from
`src/lib/circle.ts`. Actual circle creation, membership, and off-chain
coordination between users are not implemented. The collective forfeit total
shown is derived from demo fixture data.

---

## Real charity partnership

The charity recipient is a testnet account (`0.0.9762856`) controlled by the
operator. There is no partnership with any charitable organisation, no real money
moves anywhere, and no donation infrastructure. This is a testnet proof of
concept — the design intention is that forfeits settle to a real charity once the
app is on mainnet with a verified partner.

---

## Appeal UI

The appeal window logic and server route exist (`src/app/api/session/appeal/`),
and the countdown renders in the Verdict screen. But there is no polished appeal
form — submitting an appeal currently sends a blank reason. A proper UI would
let you write a short explanation, show the original intention and artifact side
by side, and confirm the appeal before sending.

---

## Streak token UI

The `STREAK` HTS token is minted on Hedera testnet (`0.0.9762627`) and the mint
call runs on a kept verdict. The token balance and streak history are not
surfaced in the UI. There is no streak counter, no animation for the mint event,
and no screen showing your token history.

---

## Submission video / screen recording

An early spec (`docs/SELFIE-CHECK-SPEC.md`) described optional screen recording
as a richer evidence artifact. It was ruled out as a privacy non-starter — we
have no business seeing your screen — and replaced with the Selfie Check (a
World App camera selfie at claim time to prove presence). The Selfie Check is
implemented; the screen recording path was never started.

---

## What is working and demoable

- Hedera testnet: stake transfer → pending escrow → settlement on verdict →
  sweep to charity. Verified on chain with real HBAR.
- HCS: pseudonymous session record written on every settled session.
- 0G Compute: coach route with API-key auth and Router fallback.
- World App: MiniKit login, World ID Selfie Check on kept verdict.
- Session flow: idle → draft → running → claim → submit → verdict → appeal
  window, all client-side state with no dead ends.
