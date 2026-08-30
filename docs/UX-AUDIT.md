# UX/UI audit

Reviewed against the product shape and design rules in `CLAUDE.md`, by driving
the running app in a headless browser at 390x844 and 375x667 rather than by
reading the source. Several of the findings below are invisible in the code and
only appear once rendered — a font that silently falls back, a class that does
nothing, a translated string that never formats.

An earlier revision of this file audited the pre-redesign app. Everything in it
has since been addressed or superseded; this replaces it.

---

## Fixed in this pass

### The app rendered half in Times New Roman

`@worldcoin/mini-apps-ui-kit-react` declares `--font-sans: "TWK Lausanne"` in a
universal `*, ::before, ::after` rule — a face it never ships, with no generic
family after it. Every kit `Typography` and `Button` resolved to the browser's
default serif, so every heading and the primary CTA on every screen rendered in
Times while body copy rendered in Geist.

The kit's own `:root` rule *does* carry a fallback stack, but the universal rule
applies the property directly to each element, and a directly-applied
declaration beats an inherited one. Overridden at `html *` to win on
specificity, since load order cannot settle it.

### Five load-bearing strings rendered as key paths in 13 languages

next-intl formats every translation with the values the component passes for the
English message. A locale that renames a placeholder does not fall back to
English — the format fails and the *key path* is rendered instead.

All thirteen locales had renamed the same five placeholders. A Spanish user on
the screen where they commit money read the literal text `StakeForm.sessionInfo`
in place of the sentence explaining what happens to their stake. The same
applied to the live screen's "1 ℏ at stake", the coach disclosure, the amnesty
sheet's promise that the stake returns in full, and the circle's pending-forfeit
line — every place an amount is named in a sentence, in every language but
English.

Three English messages separately passed rich-text renderers to `{argument}`
placeholders, which next-intl drops silently: "Closes in **,** at 01:56 PM."

`scripts/check-messages.ts` now fails on any recurrence (`pnpm check:messages`).

### Onboarding rendered twice, and above the live session

The root page rendered the auth block above the session flow while the flow's
own idle screen rendered it again. Outside World App that meant the QR card and
its four setup steps appeared twice — roughly 1,700px of install instructions on
the landing screen, with the product's hero pushed below all of it. Because the
page-level copy sat above every phase, it also stacked on top of the running
countdown, the screen meant to hold nothing but the clock and the commitment.

Setup is a one-time task and now lives behind a one-line link to a sheet.

### The loss was louder than the win

`CLAUDE.md`: *"Wins are louder than losses."* Both verdicts rendered an
identical card with an identical mark, and the slip then got more on top — the
forfeit explanation, the appeal panel, the countdown, and the circle. The only
screen that stood out was the one for losing.

A kept session now gets scale and the returned stake called out; a slip stays
small. The circle panel — which exists to say where forfeits go — no longer runs
under "You kept it".

### The verdict wash was a rectangle, not light

`position: fixed` resolves against the nearest ancestor with a transform, and
`.animate-fade-up` carries `animation-fill-mode: both`, so an identity transform
stays on the element after the entrance finishes. Two of those wrapped the
verdict, pinning the wash to the content column at 342x506 with hard edges down
both sides. Portalled to `<body>`.

### The clock drifted, and a reload destroyed the session

The countdown decremented a counter on a one-second interval. Browsers throttle
and suspend timers in a backgrounded tab, and a mini app inside World App is
backgrounded constantly, so the visible clock ran slower than the wall clock —
in a product that measures foreground time. It is now derived from the start
timestamp.

Separately, all session state lived in `useState`, so a refresh dropped the
intention, the stake and the clock and returned the user to the start screen
mid-commitment. The session is now mirrored to `sessionStorage` with its
integrity counters, and resumes against the wall clock.

### A failed settlement was a dead end

The error screen printed the raw server string as its only body copy and offered
a single "Done", so a cold backend read as "Unexpected settlement response
shape" and threw away the artifact the user had just written. It now leads with
whether the stake moved, keeps the exception under a disclosure, and can re-post
the same settlement.

### Ledger debug was the default view

A transaction ID, a topic ID and a HashScan URL were the first thing on the
screen a user reaches straight after holding a commitment. Moved behind a
`Proof on-chain` disclosure — still one tap for anyone verifying a settlement.

### The UI kit shadowed Tailwind utilities

The kit ships an entire Tailwind v3 build — a preflight plus 243 utility
selectors — with no cascade layer of its own. Unlayered author styles beat
layered ones regardless of specificity, and Tailwind v4 emits everything into
layers, so the kit silently won wherever the two overlapped. The class was in
the markup and did nothing:

- `a { color: inherit }` killed every text colour utility on a link, so
  `text-accent` on the HashScan links rendered as ordinary body text.
- `button, input, select, textarea { padding: 0 }` killed `py-*` on every form
  control, which cost the claim screen's attachment button its height — 24px
  instead of 56.

Fixed by importing the kit into its own layer, ordered after Tailwind's
`components` and before `utilities`: our utilities now win over the kit, and the
kit still wins over Tailwind's own preflight, so its components keep the resets
they are built on.

The project's own classes in `globals.css` had the same problem one file closer
to home. `.mono-caption` sets a size, a transform and a tracking, and seventeen
call sites paired it with a `text-xs`, `text-[10px]`, `normal-case` or
`tracking-*` that was silently doing nothing — including the settlement error's
technical detail, which asked for `normal-case` and rendered the server's
message in capitals anyway. They now live in `@layer components`.

### The stake was unbounded, and a large one was never confirmed

`/api/session/settle` moves value from an operator-held account and validated
only that the amount was a finite positive number: 999,999,999 passed,
unauthenticated and unrate-limited. `MAX_STAKE_HBAR` now bounds it, imported by
the form as well as the route so the two cannot disagree.

CLAUDE.md also asks for "confirmation before any large jump", which was
specified and never built — the amount field took any positive number and
started the session on one tap. Anything past the biggest preset now asks once,
before the clock starts rather than after the stake is committed.

Settlement attempts are capped at ten a minute per caller. In-process, so each
serverless instance counts separately; that is documented at the limiter rather
than implied away.

### The live session did not fit on a phone

At a fixed 232px ring the running screen ran 76px past a 390x844 viewport and
253px past a 375x667 one, putting "Finish early" and the disarm link below the
fold: someone who started a session by mistake had to scroll to find the control
telling them they did not have to finish it. The ring now takes the height its
parent has left. 390x844 fits exactly; 375x667 still scrolls, by 88px.

### Accessibility

- The kit's `Typography` renders a `<p>` unless given `as`, so only the idle
  screen had a heading. Each phase now owns one `h1`.
- Phase changes replaced the whole screen silently; a live region announces
  them, and the settlement error is a `role="alert"`.
- `--faint` measured 3.17:1 on the page and 2.94:1 on cards, and is used almost
  entirely at 11–13px. Raised to clear 4.5:1 on both.
- The kit's disabled tone put a disabled button's label at 1.44:1 against its
  fill. A disabled "Start session" is the first thing on the commitment screen
  and did not say what it was.
- Tap targets under 44px: the language switcher, the header link, the back
  button, the example chips (22px tall), "How DoomTax works", and the
  attachment button.
- None of the four bottom sheets trapped focus — Tab walked out of an open
  dialog onto controls behind a backdrop that still swallowed clicks. One of
  those dialogs is amnesty. Consolidated into one `Sheet` primitive that traps
  focus and restores it on close.
- A sheet opened from inside an animated phase was not a modal at all. Same
  containing-block trap as the wash: the explainer opened from the verdict
  measured 342x937 at y=-387, heading scrolled off the top of the screen, inset
  from both edges, with the page showing through a backdrop covering only a band
  of the viewport. `Sheet` renders through a portal now, so no caller's nesting
  can capture it.

### Smaller

- The circle panel greeted first-time users with a circle they are not in,
  other people's forfeits and a placeholder account. It waits for a finished
  session now.
- The settlement card printed `settlement.reason`, an internal string
  ("kept — nothing to transfer").
- The appeal window read "Closes in 1439:58".
- The appeal button was rust, the forfeit colour, making the user's own
  protection look like the dangerous control on the screen.
- `UserInfo` was template scaffold still painting `gray-200` borders and
  `blue-600` icons onto the dark canvas. Removed.
- Stake presets were not LTR-isolated and rendered as "ℏ 1" in Arabic.

---

## Known, not fixed

### Translation coverage is 46%

136 of 256 keys are absent from most locales and fall back to English, mostly
the long `ExplainSheet` and `About` passages — which are exactly the ones
carrying the privacy and custody claims. `Common`, the hero and the
always-visible strings on the session screens were completed for the ten
languages where the wording could be written with confidence; `sw`, `ha` and
`tw` stay on the English fallback rather than carry invented plurals.

Deliberately not closed by machine translation. A subtly wrong sentence about
what a model can see, or about whether money comes back, is worse than an
obviously English one — the fallback at least reads as untranslated rather than
as a claim the product is making.

Worth knowing for the RTL locales specifically: English text inside a
`dir="rtl"` document has its trailing punctuation reordered to the wrong end by
the bidi algorithm, so a fallback string reads as ".Your word, on the line" in
Arabic. Every fallback string on a main screen was translated for that reason;
the remaining gaps are on `/about` and inside the explainer sheets.

### The forfeit ledger is not durable on serverless

Fixed as far as it can be in code: the stores write to `/tmp` on Vercel instead
of a read-only path, so the write succeeds and the appeal route's ledger
authority engages. But `/tmp` is per-instance and lost on a cold start, so a
sweep worker on another instance still cannot see what a settlement wrote.

`DOOMTAX_DATA_DIR` points the stores at a mounted volume, and the helper warns
once at runtime when it is running somewhere ephemeral. Anything that must
survive — the charity sweep especially — needs a shared store, which is a
provisioning decision rather than a code change.

### Settlement is still unauthenticated

By design: a judge opening the preview outside World App has no wallet to sign
with, and demo mode exists so the flow still demonstrates.

`MAX_STAKE_HBAR` caps what a single call can move, and that is the bound that
actually holds. The rate limiter does not, on this deployment: it binds exactly
as configured against a single long-lived server — ten through, then 429 — but
twelve consecutive requests to the Vercel preview all went through, because each
instance keeps its own counter and requests spread across instances that may
each start cold. It is kept for the self-hosted case and is documented at the
limiter as approximately nothing on serverless.

So an unauthenticated caller can still cause repeated operator transfers on
testnet, each capped at `MAX_STAKE_HBAR`. Closing that properly means either
requiring auth — which also closes the browser demo path — or a shared store for
the counter. Both are decisions rather than code.

### `AUTH_SECRET` is not scoped to Preview

Preview deployments return Auth.js's generic configuration error, so sign-in is
dead there while production works. A dashboard setting, not code.

### No live Hedera, 0G or World ID call has been exercised

This environment has no testnet credentials and blocks the gRPC consensus port,
so those paths are verified by shape and failure handling only. What the
deployment log did confirm is that the 0G SDK import itself was breaking the
settle route — see above.
