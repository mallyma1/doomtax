/**
 * Guards the message catalogues against placeholder drift.
 *
 * Every translation is formatted with the values the component passes for the
 * English message, so a locale that renames a placeholder — `{stakeHbar}` where
 * the code sends `{stake}` — does not fall back to English. next-intl fails the
 * format and renders the key path instead, so the user reads the literal text
 * `StakeForm.sessionInfo` where the sentence explaining what happens to their
 * stake should be. Silent, and invisible to anyone testing in English.
 *
 * Run: pnpm exec tsx scripts/check-messages.ts
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MESSAGES_DIR = join(process.cwd(), 'src/i18n/messages');
const BASE_LOCALE = 'en-GB.json';

/** `{name}` and `{name, plural, ...}` — the values a component must supply. */
const ARGUMENT = /\{\s*([A-Za-z0-9_]+)\s*[,}]/g;
/** `<tag>` — the rich-text chunks a component must supply a renderer for. */
const TAG = /<\s*([A-Za-z0-9_]+)\s*>/g;

type Tree = { [key: string]: unknown };

function flatten(node: unknown, path: string[] = []): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof node === 'string') {
    out.set(path.join('.'), node);
  } else if (Array.isArray(node)) {
    node.forEach((child, i) => {
      for (const [k, v] of flatten(child, [...path, String(i)])) out.set(k, v);
    });
  } else if (node && typeof node === 'object') {
    for (const [key, child] of Object.entries(node as Tree)) {
      for (const [k, v] of flatten(child, [...path, key])) out.set(k, v);
    }
  }
  return out;
}

const names = (text: string, pattern: RegExp) =>
  [...text.matchAll(new RegExp(pattern))].map((m) => m[1]).sort().join(',');

const read = (file: string) =>
  flatten(JSON.parse(readFileSync(join(MESSAGES_DIR, file), 'utf8')));

const base = read(BASE_LOCALE);
const problems: string[] = [];

for (const file of readdirSync(MESSAGES_DIR).sort()) {
  if (!file.endsWith('.json') || file === BASE_LOCALE) continue;

  for (const [key, text] of read(file)) {
    const english = base.get(key);
    if (english === undefined) {
      // Not a fallback risk, but it is dead weight a translator will maintain.
      problems.push(`${file}  ${key}: not present in ${BASE_LOCALE}`);
      continue;
    }
    for (const [label, pattern] of [
      ['arguments', ARGUMENT],
      ['tags', TAG],
    ] as const) {
      const want = names(english, pattern);
      const got = names(text, pattern);
      if (want !== got) {
        problems.push(
          `${file}  ${key}: ${label} [${got}] should be [${want}]`,
        );
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`${problems.length} message problem(s):\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(`Message catalogues agree with ${BASE_LOCALE}.`);
