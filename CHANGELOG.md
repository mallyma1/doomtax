# Changelog

Notable changes to DoomTax. Newest first.

Dates are absolute. Entries describe what changed for a user or a developer,
not every commit. See `git log` for the full history.

## Unreleased

### Fixed

- `/api/session/settle` returned a 500 crash page in production for every
  request. The 0G SDK's ESM entry re-exports named bindings out of a CommonJS
  chunk, which Vercel's runtime cannot resolve, so the route module threw while
  loading and the handler never ran. Settlement — the one action the product
  exists for — was down. Loaded through `createRequire` now.
- Auth.js rejected the hostname of every Vercel preview deployment, so sign-in
  was dead there and each page render logged an error.
- The stake had no upper bound: 999,999,999 passed validation on an endpoint
  that moves operator funds. Bounded by `MAX_STAKE_HBAR`, shared by the form and
  the route, and settlement attempts are now rate limited.
- The custody map, forfeit ledger and selfie-check record all wrote to a path
  that is read-only on Vercel. Every write failed silently, so no forfeit was
  ever recorded and the charity sweep had nothing to act on.

- Headings and buttons rendered in the browser's default serif. The UI kit
  declares `--font-sans: "TWK Lausanne"` in a universal rule, naming a face it
  never ships with no generic family behind it, so every kit `Typography` and
  `Button` fell back to Times against Geist body copy.
- Five load-bearing strings rendered as their key paths in all thirteen
  non-English locales, including the sentence explaining what happens to a
  user's stake. next-intl formats translations with the values the component
  passes for the English message, so a locale that renames a placeholder does
  not fall back to English — it fails to format. `pnpm check:messages` now
  guards against recurrence.
- The World App onboarding card rendered twice outside World App, burying the
  product under roughly 1,700px of install instructions and stacking on top of
  the live countdown. It is now a sheet behind a one-line link.
- The session clock decremented a counter on an interval, so it lost time
  whenever the tab was backgrounded. It is read from the start timestamp now.
- A page reload destroyed a running session. It is mirrored to `sessionStorage`
  with its integrity counters and resumes against the wall clock.
- A failed settlement was a dead end: the raw server string as body copy and a
  single "Done" that discarded the artifact. It now says whether the stake
  moved and can retry.
- The verdict wash rendered as a hard-edged rectangle. `position: fixed`
  resolves against the nearest transformed ancestor, and `.animate-fade-up`
  retains an identity transform after it finishes.
- The live session did not fit a phone screen, putting "Finish early" and the
  disarm link below the fold.
- The UI kit shadowed Tailwind utilities wherever the two overlapped, because
  it ships an unlayered Tailwind v3 build and Tailwind v4 emits into layers:
  `text-*` did nothing on a link and `py-*` did nothing on a form control. The
  kit is now imported into its own cascade layer between `components` and
  `utilities`.
- A bottom sheet opened from inside an animated phase rendered inset and
  scrolled off-screen with a backdrop covering only part of the viewport, since
  `position: fixed` resolves against the nearest transformed ancestor. Sheets
  render through a portal now.
- Accessibility: every phase now carries an `h1` (the kit's `Typography`
  renders a `<p>` by default), phase changes are announced, `--faint` and the
  kit's disabled tone now meet contrast, and tap targets under 44px were
  enlarged. The bottom sheets trap focus and restore it on close.

### Added

- Confirmation before a large stake, which CLAUDE.md specified and the app
  never implemented.
- A designed session flow across four screens: commit, live session, artifact
  submission, and verdict. Replaces the unstyled forms that shipped before.
- `CountdownRing`, the live session clock. The arc is time remaining, so it
  depletes toward the commitment, with a marker riding its leading edge.
- `ConfirmSheet`, the amnesty confirmation. Hand-rolled rather than using the
  UI kit's `Drawer`: that component bundles vaul built against React 18 and its
  portal never mounts under React 19. Amnesty is the one control that
  guarantees a user can always recover their stake, so it should not depend on
  a mismatched transitive dependency.
- A disclosure panel on the artifact screen listing exactly what the coach
  receives: the intention, the artifact, foreground time and interruption
  count, and an explicit statement that screen contents, browsing, keystrokes
  and third-party app data never leave the device.
- Promotional assets under `public/promo`: two 1080x1080 squares and a
  1200x630 OpenGraph card.

### Changed

- The verdict screen now surfaces settlement evidence directly: the HashScan
  link when funds moved, the HCS transaction ID, and the reason when no
  transfer occurred. Previously these were rendered as raw JSON.
- The appeal window is presented as a live countdown with an inline reason
  field, reading its deadline from `getAppealTimeRemainingMs` rather than
  hardcoding a duration. It respects `APPEAL_WINDOW_MS`.
- Dark theme throughout. Amber is reserved for live commitments: if it glows,
  value is at stake. Green and rust appear only at settlement.
- `CirclePanel` restyled onto the shared tokens. It previously hardcoded
  Tailwind grays and blues, which rendered as white cards on the dark canvas.
- `AuthButton` is now full width and reads "Connect World App".
- The verdict screen follows "wins are louder than losses": a kept session gets
  scale and the returned stake called out, a slip stays quiet, and the circle
  panel no longer runs under "You kept it". Ledger detail moved behind a
  `Proof on-chain` disclosure.
- The circle panel waits for a first finished session rather than greeting new
  users with a circle they are not in.
- All four bottom sheets share one `Sheet` primitive.

- The appeal window is now 24 hours by default, up from 60 seconds. A slipped
  verdict is the only outcome that costs a user money, and the window is what
  makes that cost reversible. A window shorter than a sleep cycle means the
  appeal path exists on paper but not in practice: the user has to notice, come
  back and contest before the sweep runs. Set `APPEAL_WINDOW_MS` to shorten it
  for a live demo.
- `scripts/sweep-charity.ts` reports time remaining in scaled units, since raw
  seconds are unreadable against a 24 hour window.

### Fixed

- The UI kit's grey ramp is remapped for a dark canvas in `layout.tsx`.
  `@worldcoin/mini-apps-ui-kit-react` ships a light-page scale where `gray-0`
  is white and `gray-900` is near-black, so the active tab label rendered
  near-black on near-black and primary buttons rendered as white slabs. The
  remap is applied inline because the kit's stylesheet is unlayered and
  injected after `globals.css`, so no rule in that file wins the cascade.
- The verdict background wash is anchored to the viewport instead of its
  container. Clipped to a flex child it rendered as a visible rectangle rather
  than as light falling from the top edge.
- Stray `console.log` calls removed from `AuthButton`.
- `outputFileTracingRoot` pinned to the project. A lockfile in a parent
  directory made Next infer the wrong workspace root, which broke file tracing
  and `next lint`.

### Notes

- Session length and stake options are read from `SESSION_DURATION_SECONDS`
  and `STAKE_OPTIONS_HBAR` in `lib/session.ts` rather than hardcoded in the
  UI, so demo mode and the settle route cannot disagree about which mode they
  are in. With `NEXT_PUBLIC_DEMO_MODE` unset, a session is 30 seconds and
  stakes are 1, 5 or 10 HBAR.
- Settlement, appeal, coach and HCS behaviour are unchanged. This work
  replaced presentation only; `/api/session/settle` and `/api/session/appeal`
  are called exactly as before, and the commitment hash is still derived in
  the browser so the intention text never leaves the device.
