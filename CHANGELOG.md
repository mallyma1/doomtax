# Changelog

Notable changes to DoomTax. Newest first.

Dates are absolute. Entries describe what changed for a user or a developer,
not every commit. See `git log` for the full history.

## Unreleased

### Added

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
