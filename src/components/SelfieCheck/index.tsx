'use client';

import { IDKit, selfieCheckLegacy, type RpContext } from '@worldcoin/idkit';
import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

/**
 * Claim-time Selfie Check (`docs/SELFIE-CHECK-SPEC.md` §5).
 *
 * Confirms a live human is present at the moment of claim. It is **recorded,
 * never enforced**: declining, denying the camera, a timeout or a Developer
 * Portal outage all leave the settlement exactly as it was. Nothing here
 * returns a value the caller can gate on, and nothing here can fail in a way
 * that costs the user money or a streak.
 *
 * That is why every terminal state below is phrased as a statement of fact
 * rather than an error. A red "failed" on a screen where money has just
 * resolved would imply a consequence that does not exist.
 */

const FEEDBACK_LABEL_KEYS = {
  pending: 'feedbackPending',
  failed: 'feedbackFailed',
  success: 'feedbackSuccess',
} as const;

type CheckState = 'idle' | 'pending' | 'verified' | 'skipped';

export const SelfieCheck = ({
  sessionId,
  action,
}: {
  sessionId: string;
  action: string;
}) => {
  const [state, setState] = useState<CheckState>('idle');
  const t = useTranslations('SelfieCheck');

  /**
   * Records the outcome regardless of what happened. A decline is posted with
   * a null proof rather than dropped, because "the user chose not to" is the
   * fact the record exists to capture — silently skipping it would leave the
   * declined case indistinguishable from a session that never reached here.
   */
  const record = async (rpId: string | null, idkitResponse: unknown) => {
    if (!rpId) return;
    try {
      await fetch('/api/session/selfie-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, rp_id: rpId, idkitResponse }),
      });
    } catch {
      // Best-effort by design. The claim is already settled; a lost record is
      // missing evidence, not a failed user action.
    }
  };

  const onClickCheck = async () => {
    setState('pending');
    let rpId: string | null = null;

    try {
      const rpRes = await fetch('/api/rp-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!rpRes.ok) {
        throw new Error('Failed to get RP signature');
      }

      const rpSig = await rpRes.json();
      rpId = rpSig.rp_id as string;
      const rpContext: RpContext = {
        rp_id: rpSig.rp_id,
        nonce: rpSig.nonce,
        created_at: rpSig.created_at,
        expires_at: rpSig.expires_at,
        signature: rpSig.sig,
      };

      const request = await IDKit.request({
        app_id: process.env.NEXT_PUBLIC_APP_ID as `app_${string}`,
        action,
        rp_context: rpContext,
        allow_legacy_proofs: true,
        // The signal binds the proof to this session, so the nullifier is
        // per-session rather than a durable identity key (spec §4). Passing a
        // user ID or wallet address here would make every claim linkable.
        //
        // No `require_user_presence`: that is a request-level liveness flag for
        // other credentials, and Selfie Check is already a liveness credential.
      }).preset(selfieCheckLegacy({ signal: sessionId }));

      const completion = await request.pollUntilCompletion();

      if (!completion.success) {
        await record(rpId, null);
        setState('skipped');
        return;
      }

      const response = await fetch('/api/session/selfie-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          rp_id: rpId,
          idkitResponse: completion.result,
        }),
      });

      const data = await response.json();
      setState(data.outcome === 'verified' ? 'verified' : 'skipped');
    } catch {
      await record(rpId, null);
      setState('skipped');
    }
  };

  if (state === 'verified') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-1">
        <p className="text-sm font-medium text-green-950">{t('verifiedTitle')}</p>
        <p className="text-sm text-green-900">{t('verifiedBody')}</p>
      </div>
    );
  }

  if (state === 'skipped') {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-1">
        <p className="text-sm font-medium text-gray-900">{t('skippedTitle')}</p>
        <p className="text-sm text-gray-700">{t('skippedBody')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
      <p className="text-sm font-medium text-gray-900">{t('idleTitle')}</p>
      <p className="text-sm text-gray-700">{t('idleBody')}</p>
      <LiveFeedback
        label={{
          pending: t(FEEDBACK_LABEL_KEYS.pending),
          failed: t(FEEDBACK_LABEL_KEYS.failed),
          success: t(FEEDBACK_LABEL_KEYS.success),
        }}
        state={state === 'pending' ? 'pending' : undefined}
        className="w-full"
      >
        <Button
          onClick={onClickCheck}
          disabled={state === 'pending'}
          size="lg"
          variant="tertiary"
          className="w-full"
        >
          {t('confirmButton')}
        </Button>
      </LiveFeedback>
    </div>
  );
};
