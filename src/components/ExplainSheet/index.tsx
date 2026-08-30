'use client';

import { Sheet } from '@/components/Sheet';
import { useTranslations } from 'next-intl';

export type ExplainTopic =
  | 'hedera-settlement'
  | 'hcs-receipt'
  | '0g-coach'
  | 'world-minikit'
  | 'streak-token';

/**
 * Topic content lives in the message catalogue, not here.
 *
 * These paragraphs carry the privacy and custody claims — what settles, what
 * reaches the public ledger, what the model can see. A user reading in Arabic
 * or Hausa needs those claims in their own language just as much as an English
 * reader does, so leaving them hardcoded would make the honesty English-only.
 */
const TOPIC_LINKS: Partial<Record<ExplainTopic, string>> = {
  'streak-token': 'https://hashscan.io/testnet/token/0.0.9762627',
};

interface ExplainSheetProps {
  topic: ExplainTopic;
  onClose: () => void;
  hashScanUrl?: string;
}

/**
 * Bottom sheet for on-chain explainers.
 *
 * Chrome comes from the shared Sheet primitive; this component supplies only
 * the topic content.
 */
export const ExplainSheet = ({ topic, onClose, hashScanUrl }: ExplainSheetProps) => {
  const t = useTranslations(`ExplainSheet.${topic}`);
  const tSheet = useTranslations('ExplainSheet');
  const tc = useTranslations('Common');

  const asList = (key: string): string[] => {
    const value = t.raw(key);
    return Array.isArray(value) ? (value as string[]) : [];
  };

  const paragraphs = asList('paragraphs');
  const publicItems = asList('publicItems');
  const privateItems = asList('privateItems');
  const topicLink = TOPIC_LINKS[topic];

  return (
    <Sheet onClose={onClose} labelledBy="explain-title" closeLabel={tc('close')}>
      <p className="mono-caption text-accent">{t('eyebrow')}</p>
      <h2
        id="explain-title"
        className="mt-1.5 text-xl font-semibold text-foreground"
      >
        {t('title')}
      </h2>

      <div className="mt-4 space-y-3">
        {paragraphs.map((p, i) => (
          <p key={i} className="max-w-[36ch] text-sm leading-relaxed text-muted">
            {p}
          </p>
        ))}
      </div>

      {publicItems.length > 0 && (
        <div className="mt-4">
          <p className="mono-caption mb-2 text-faint">{t('publicLabel')}</p>
          <ul className="space-y-1.5">
            {publicItems.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {privateItems.length > 0 && (
        <div className="mt-4">
          <p className="mono-caption mb-2 text-faint">{t('privateLabel')}</p>
          <ul className="space-y-1.5">
            {privateItems.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-border" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(hashScanUrl ?? topicLink) && (
        <div className="mt-5">
          <a
            href={hashScanUrl ?? topicLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-accent underline underline-offset-4"
          >
            {hashScanUrl ? tc('viewOnHashScan') : t('linkLabel')}
          </a>
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="mt-6 h-12 w-full rounded-full border border-border text-sm font-semibold text-muted transition-colors hover:text-foreground"
      >
        {tSheet('close')}
      </button>
    </Sheet>
  );
};
