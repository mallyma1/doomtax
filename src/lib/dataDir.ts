import fs from 'fs';
import path from 'path';

/**
 * Where the server's small JSON stores live: the custody map, the session
 * ledger, and the selfie-check record.
 *
 * All three used `process.cwd()/data`, which does not exist as a writable path
 * on a serverless host. On Vercel everything outside `/tmp` is read-only, so
 * `fs.mkdirSync` threw on the first write and every caller swallowed it — by
 * design, because none of them may fail a settlement that has already moved
 * money. The result was silent: no forfeit was ever recorded, so the charity
 * sweep had nothing to act on and the appeal route's ledger authority never
 * engaged.
 *
 * Writing to `/tmp` makes the write succeed, which is better than losing it
 * outright, but it is not durability: `/tmp` is per-instance and vanishes on a
 * cold start, so two requests can land on different instances and a sweep
 * worker cannot see what a settlement wrote. Anything that must survive that
 * needs a real shared store; `DOOMTAX_DATA_DIR` is here so a mounted volume or
 * a container host can point these files somewhere that does.
 *
 * `warnIfEphemeral` exists so this degradation is stated once at runtime rather
 * than discovered later from an empty sweep.
 */

const EPHEMERAL_DIR = '/tmp/doomtax';

export const DATA_DIR =
  process.env.DOOMTAX_DATA_DIR?.trim() ||
  (process.env.VERCEL ? EPHEMERAL_DIR : path.join(process.cwd(), 'data'));

/** True when the location cannot outlive the instance that wrote to it. */
export const DATA_DIR_IS_EPHEMERAL =
  !process.env.DOOMTAX_DATA_DIR?.trim() && !!process.env.VERCEL;

let warned = false;

export function warnIfEphemeral(store: string): void {
  if (!DATA_DIR_IS_EPHEMERAL || warned) return;
  warned = true;
  console.warn(
    `[${store}] Writing to ${DATA_DIR}, which is per-instance and lost on a ` +
      'cold start. Forfeit records, custody mappings and appeal state will not ' +
      'be visible to other instances or to the charity sweep. Set ' +
      'DOOMTAX_DATA_DIR to durable storage before relying on any of them.',
  );
}

/** Creates the directory if it does not exist. Throws only if that fails. */
export function ensureDataDir(store: string): void {
  warnIfEphemeral(store);
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
