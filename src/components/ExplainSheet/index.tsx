'use client';

import { useEffect, useRef } from 'react';

export type ExplainTopic =
  | 'hedera-settlement'
  | 'hcs-receipt'
  | '0g-coach'
  | 'world-minikit'
  | 'streak-token';

interface TopicContent {
  eyebrow: string;
  title: string;
  paragraphs: string[];
  publicList?: { label: string; items: string[] };
  privateList?: { label: string; items: string[] };
  link?: { href: string; label: string };
}

const EXPLAIN_TOPICS: Record<ExplainTopic, TopicContent> = {
  'hedera-settlement': {
    eyebrow: 'Settlement',
    title: 'What settles on Hedera',
    paragraphs: [
      'When a session verdict is slipped, DoomTax performs an operator-signed transfer on Hedera testnet using the Hedera SDK — no smart contract, no Solidity, SDK only.',
      'Your stake moves to a pending account first. It sweeps to the shared cause only after the appeal window closes, which is what makes reversals genuinely possible rather than rhetorical.',
      'When a session is kept, your stake never moves at all. No transfer is made, so there is no transaction to show on HashScan.',
      'Stakes are testnet HBAR — no real-world money today.',
    ],
    privateList: {
      label: 'What never moves',
      items: [
        'Any HBAR on a kept session',
        'Funds during the appeal window',
        'Anything after a successful amnesty',
      ],
    },
  },
  'hcs-receipt': {
    eyebrow: 'Public receipt',
    title: 'What goes on the public ledger',
    paragraphs: [
      'After settlement, DoomTax writes a single record to a Hedera Consensus Service (HCS) topic. HCS is a public, permanent, append-only ledger — every record is visible to anyone, forever.',
      'Because it is permanent and public, the record carries only the minimum necessary to be useful as a verifiable receipt.',
    ],
    publicList: {
      label: 'What the record carries',
      items: [
        'Pseudonymous session ID',
        'Commitment hash (a one-way fingerprint of your intention — not the text itself)',
        'Verdict boolean (kept or slipped)',
        'Amount in tinybars',
        'Timestamp',
      ],
    },
    privateList: {
      label: 'What is never on HCS',
      items: [
        'Your intention text',
        'Your artifact or any evidence',
        'Coaching messages',
        'Circle membership',
        'Anything linking the session to a person',
      ],
    },
  },
  '0g-coach': {
    eyebrow: '0G Compute',
    title: 'How the coach decides',
    paragraphs: [
      'The verdict runs privately on 0G Compute. The model receives exactly the information below and nothing else.',
      'Ambiguity always resolves toward you. Contested session, failed inference, timeout, missing evidence: refund. A wrong kept costs nothing; a wrong slipped costs trust.',
    ],
    publicList: {
      label: 'What the model sees',
      items: [
        'The intention you stated at session start',
        'The artifact text you submitted at the end',
        'Foreground time (from the Page Visibility API)',
        'Interruption count',
      ],
    },
    privateList: {
      label: 'What the model never sees',
      items: [
        'Your screen or window contents',
        'Your browsing history',
        'Your keystrokes',
        'Location or third-party app data',
      ],
    },
  },
  'world-minikit': {
    eyebrow: 'World App',
    title: 'What signing with World App means',
    paragraphs: [
      'Tapping Connect in World App signs a single message on World Chain. This signs in to DoomTax — it costs nothing and moves nothing.',
      "World App can only sign World Chain transactions. It cannot sign Hedera transactions, so DoomTax provisions and holds an operator-custodied Hedera testnet account for your sessions. You approved this at sign-in, and it is recorded.",
      "You don't need a Hedera wallet. Nothing else to connect.",
    ],
    privateList: {
      label: 'What the signature does not do',
      items: [
        'Does not charge you',
        'Does not move any funds',
        'Does not give DoomTax access to your World App balance',
      ],
    },
  },
  'streak-token': {
    eyebrow: 'Streak token',
    title: 'The streak token',
    paragraphs: [
      'When a session verdict is kept, DoomTax mints one token to your session account on Hedera testnet using the Hedera Token Service (HTS).',
      'It is a record of a kept commitment, on-chain and yours. No monetary value — it is a receipt, not a reward.',
    ],
    link: {
      href: 'https://hashscan.io/testnet/token/0.0.9762627',
      label: 'View token on HashScan',
    },
  },
};

interface ExplainSheetProps {
  topic: ExplainTopic;
  onClose: () => void;
  hashScanUrl?: string;
}

/**
 * Bottom sheet for on-chain explainers.
 *
 * Clones the hand-rolled sheet mechanics from ConfirmSheet: Escape handling,
 * focus, body scroll lock, animate-sheet-up, backdrop bg-black/70.
 * Does NOT use the kit Drawer — vaul/React 19 portal bug documented in ConfirmSheet.
 */
export const ExplainSheet = ({ topic, onClose, hashScanUrl }: ExplainSheetProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const content = EXPLAIN_TOPICS[topic];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="explain-title"
        tabIndex={-1}
        className="animate-sheet-up relative max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-surface px-6 pb-[max(2.25rem,env(safe-area-inset-bottom))] pt-5 outline-none"
      >
        {/* Grabber */}
        <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-border" aria-hidden="true" />

        <p className="mono-caption text-accent">{content.eyebrow}</p>
        <h2
          id="explain-title"
          className="mt-1.5 text-xl font-semibold text-foreground"
        >
          {content.title}
        </h2>

        <div className="mt-4 space-y-3">
          {content.paragraphs.map((p, i) => (
            <p key={i} className="max-w-[36ch] text-sm leading-relaxed text-muted">
              {p}
            </p>
          ))}
        </div>

        {content.publicList && (
          <div className="mt-4">
            <p className="mono-caption mb-2 text-faint">
              {content.publicList.label}
            </p>
            <ul className="space-y-1.5">
              {content.publicList.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {content.privateList && (
          <div className="mt-4">
            <p className="mono-caption mb-2 text-faint">
              {content.privateList.label}
            </p>
            <ul className="space-y-1.5">
              {content.privateList.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-border" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(hashScanUrl ?? content.link) && (
          <div className="mt-5">
            <a
              href={hashScanUrl ?? content.link?.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-accent underline underline-offset-4"
            >
              {hashScanUrl ? 'View transaction on HashScan' : content.link?.label}
            </a>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 h-12 w-full rounded-full border border-border text-sm font-semibold text-muted transition-colors hover:text-foreground"
        >
          Close
        </button>
      </div>
    </div>
  );
};
