'use client';

import { sha256Hex } from '@/lib/session';
import { Button, Spinner, Typography } from '@worldcoin/mini-apps-ui-kit-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useRef, useState } from 'react';

const MAX_ARTIFACT = 600;

interface AttachmentState {
  name: string;
  size: number;
  previewUrl: string;
  hashHex: string;
}

interface ArtifactFormProps {
  intention: string;
  foregroundSeconds: number;
  interruptions: number;
  submitting: boolean;
  onSubmit: (artifact: string) => void;
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function truncateHash(hex: string): string {
  return `${hex.slice(0, 6)}…${hex.slice(-4)}`;
}

/**
 * End of session. The user shows their work, then the coach rules on it.
 *
 * Judging happens server side in /api/session/settle, which calls the private
 * coach on 0G. Nothing here decides a verdict. The disclosure below the field
 * is not boilerplate: users are handing evidence to a model that can take
 * their stake, so the screen states plainly what is sent and what never
 * leaves the device.
 */
export const ArtifactForm = ({
  intention,
  foregroundSeconds,
  interruptions,
  submitting,
  onSubmit,
}: ArtifactFormProps) => {
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<AttachmentState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations('ArtifactForm');
  const tc = useTranslations('Common');

  const handleFile = async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    const buffer = await file.arrayBuffer();
    const hashHex = await sha256Hex(buffer);
    if (attachment?.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
    setAttachment({ name: file.name, size: file.size, previewUrl, hashHex });
  };

  const removeAttachment = () => {
    if (attachment?.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (submitting) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
        <Spinner />
        <div>
          <Typography
            as="h1"
            variant="heading"
            level={3}
            className="text-foreground"
          >
            {t('coachReading')}
          </Typography>
          <Typography variant="body" level={3} className="mt-1 text-muted">
            {t('coachReadingBody')}
          </Typography>
        </div>
      </div>
    );
  }

  const held = formatClock(foregroundSeconds);
  const tooShort = draft.trim().length < 12;

  return (
    <div className="animate-fade-up flex w-full flex-col gap-6">
      <div>
        <Typography
          as="h1"
          variant="heading"
          level={2}
          className="text-foreground"
        >
          {t('heading')}
        </Typography>
        <Typography variant="body" level={3} className="mt-1 text-muted">
          {t('youCommitted')}
        </Typography>
        <div className="card-raised mt-3 rounded-2xl border border-border bg-surface px-4 py-3">
          <Typography variant="body" level={3} className="text-foreground">
            {intention}
          </Typography>
        </div>
      </div>

      <div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_ARTIFACT))}
          rows={6}
          autoFocus
          placeholder={t('placeholderArtifact')}
          aria-label={t('artifactLabel')}
          className="w-full resize-none rounded-2xl border border-border bg-surface p-4 text-base leading-relaxed text-foreground outline-none transition-colors placeholder:text-faint focus:border-accent focus:bg-surface-raised"
        />
        <div className="mt-1.5 text-end text-xs text-faint">
          {draft.length}/{MAX_ARTIFACT}
        </div>
      </div>

      {/* Attachment */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-label={t('attachAriaLabel')}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {attachment ? (
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-3">
            <Image
              src={attachment.previewUrl}
              alt={t('attachmentPreviewAlt')}
              width={80}
              height={80}
              className="h-20 w-20 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{attachment.name}</p>
              <p className="text-xs text-faint">{formatBytes(attachment.size)}</p>
              <p
                className="mono-caption mt-1 text-xs text-faint"
                title={attachment.hashHex}
              >
                {truncateHash(attachment.hashHex)}
              </p>
            </div>
            <button
              type="button"
              aria-label={t('removeAttachment')}
              onClick={removeAttachment}
              className="shrink-0 p-2 text-faint hover:text-foreground"
            >
              ×
            </button>
          </div>
        ) : (
          /* min-h rather than padding, so the tap target holds at 56px. */
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 text-sm text-muted transition-colors hover:border-muted hover:text-foreground"
          >
            <span aria-hidden="true">📎</span>
            {t('attachButton')}
          </button>
        )}
        <p className="mt-2 text-xs leading-relaxed text-faint max-w-[36ch]">
          {t('attachCaption')}
        </p>
      </div>

      <div className="card-raised rounded-2xl border border-border bg-surface p-4">
        <span className="mono-caption text-xs text-faint">
          {t('coachReads')}
        </span>
        <ul className="mt-2.5 flex flex-col gap-1.5 text-sm text-muted">
          <li className="flex gap-2">
            <span className="text-accent" aria-hidden="true">+</span>
            {t('coachReceivesIntention')}
          </li>
          <li className="flex gap-2">
            <span className="text-accent" aria-hidden="true">+</span>
            <span className="tabular">
              {t('coachReceivesForeground', {
                held,
                // Pluralised through Common so each locale can translate the
                // noun without restating this sentence's plural rules.
                interruptions: tc('interruptionsCount', { count: interruptions }),
              })}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-faint" aria-hidden="true">−</span>
            {t('coachNeverReceivesAttachment')}
          </li>
        </ul>
        <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-faint">
          {t('coachPrivacy')}
        </p>
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={tooShort}
        onClick={() => onSubmit(draft)}
      >
        {t('submit')}
      </Button>
    </div>
  );
};
