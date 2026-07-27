'use client';

import {
  DEMO_CIRCLE,
  DEMO_CIRCLE_ACTIVITY,
  deriveCircleImpact,
  formatTinybarAsHbar,
} from '@/lib/circle';
import { UsdHint } from '@/components/UsdHint';
import { useTranslations } from 'next-intl';

const IMPACT = deriveCircleImpact(DEMO_CIRCLE, DEMO_CIRCLE_ACTIVITY, 'This week');

export const CirclePanel = ({
  pendingForfeitHbar,
}: {
  pendingForfeitHbar: number | null;
}) => {
  const t = useTranslations('CirclePanel');
  return (
    <section className="card-raised w-full max-w-xl rounded-2xl border border-border bg-surface p-4 space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t('heading')}</h2>
        <p className="text-sm text-muted">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="card-raised rounded-lg border border-border bg-surface p-3">
          <p className="text-xs uppercase tracking-wide text-faint">
            {t('circleLabel')}
          </p>
          <p className="text-sm font-medium text-foreground">{DEMO_CIRCLE.name}</p>
          <p className="text-xs text-faint">
            {t('members', { count: DEMO_CIRCLE.memberSessionKeys.length })}
          </p>
        </div>

        <div className="card-raised rounded-lg border border-border bg-surface p-3">
          <p className="text-xs uppercase tracking-wide text-faint">
            {t('causeLabel')}
          </p>
          <p className="text-sm font-medium text-foreground">{DEMO_CIRCLE.causeName}</p>
          <p className="text-xs text-faint">
            {t('causeAccount', { account: DEMO_CIRCLE.causeAccountId })}
          </p>
        </div>
      </div>

      <div className="card-raised rounded-lg border border-accent/30 bg-accent/10 p-3">
        <p className="text-xs uppercase tracking-wide text-accent">
          {t('periodThisWeek')}
        </p>
        <p className="text-2xl font-semibold text-foreground">
          {formatTinybarAsHbar(IMPACT.totalTinybars)} HBAR
        </p>
        <UsdHint hbar={Number(formatTinybarAsHbar(IMPACT.totalTinybars))} />
        <p className="text-sm text-muted">
          {t('impactDetail', { count: IMPACT.sessionCount })}
        </p>
      </div>

      {pendingForfeitHbar !== null ? (
        <p className="text-sm text-muted">
          {t.rich('pendingForfeit', {
            amount: () => (
              <>
                {pendingForfeitHbar} HBAR{' '}
                <UsdHint hbar={pendingForfeitHbar} className="inline" />
              </>
            ),
          })}
        </p>
      ) : (
        <p className="text-sm text-muted">{t('private')}</p>
      )}
    </section>
  );
};
