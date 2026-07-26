'use client';

import { Button, Spinner, Typography } from '@worldcoin/mini-apps-ui-kit-react';
import { useState } from 'react';

const MAX_ARTIFACT = 600;

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

  if (submitting) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
        <Spinner />
        <div>
          <Typography variant="heading" level={3} className="text-foreground">
            Your coach is reading
          </Typography>
          <Typography variant="body" level={3} className="mt-1 text-muted">
            Running privately on 0G, then settling on Hedera. This takes a
            moment.
          </Typography>
        </div>
      </div>
    );
  }

  const held = formatClock(foregroundSeconds);
  const tooShort = draft.trim().length < 12;

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <Typography variant="heading" level={2} className="text-foreground">
          Show your work
        </Typography>
        <Typography variant="body" level={3} className="mt-1 text-muted">
          You committed to this:
        </Typography>
        <div className="mt-3 rounded-2xl border border-border bg-surface px-4 py-3">
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
          placeholder="Paste what you produced, or describe what you finished and where it lives."
          aria-label="Your artifact for this session"
          className="w-full resize-none rounded-2xl border border-border bg-surface p-4 text-base leading-relaxed text-foreground outline-none placeholder:text-faint focus:border-accent"
        />
        <div className="mt-1.5 text-right text-xs text-faint">
          {draft.length}/{MAX_ARTIFACT}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <span className="mono-caption text-xs uppercase tracking-widest text-faint">
          What your coach receives
        </span>
        <ul className="mt-2.5 flex flex-col gap-1.5 text-sm text-muted">
          <li className="flex gap-2">
            <span className="text-accent" aria-hidden="true">
              +
            </span>
            Your intention and the text above
          </li>
          <li className="flex gap-2">
            <span className="text-accent" aria-hidden="true">
              +
            </span>
            <span className="tabular">
              {held} in the foreground, {interruptions}{' '}
              {interruptions === 1 ? 'interruption' : 'interruptions'}
            </span>
          </li>
        </ul>
        <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-faint">
          Never your screen, your browsing, your keystrokes, or anything from
          other apps.
        </p>
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={tooShort}
        onClick={() => onSubmit(draft)}
      >
        Submit for review
      </Button>
    </div>
  );
};
