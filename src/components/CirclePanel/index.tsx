import {
  DEMO_CIRCLE,
  DEMO_CIRCLE_ACTIVITY,
  deriveCircleImpact,
  formatTinybarAsHbar,
} from '@/lib/circle';
import { UsdHint } from '@/components/UsdHint';

const IMPACT = deriveCircleImpact(DEMO_CIRCLE, DEMO_CIRCLE_ACTIVITY, 'This week');

export const CirclePanel = ({
  pendingForfeitHbar,
}: {
  pendingForfeitHbar: number | null;
}) => {
  return (
    <section className="card-raised w-full max-w-xl rounded-2xl border border-border bg-surface p-4 space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Circle</h2>
        <p className="text-sm text-muted">
          A circle gives your slips somewhere good to go. You back one cause
          together and only see the total you have funded as a group.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="card-raised rounded-lg border border-border bg-surface p-3">
          <p className="text-xs uppercase tracking-wide text-faint">Circle</p>
          <p className="text-sm font-medium text-foreground">{DEMO_CIRCLE.name}</p>
          <p className="text-xs text-faint">{DEMO_CIRCLE.memberSessionKeys.length} members</p>
        </div>

        <div className="card-raised rounded-lg border border-border bg-surface p-3">
          <p className="text-xs uppercase tracking-wide text-faint">Shared cause</p>
          <p className="text-sm font-medium text-foreground">{DEMO_CIRCLE.causeName}</p>
          <p className="text-xs text-faint">Current demo account: {DEMO_CIRCLE.causeAccountId}</p>
        </div>
      </div>

      <div className="card-raised rounded-lg border border-accent/30 bg-accent/10 p-3">
        <p className="text-xs uppercase tracking-wide text-accent">{IMPACT.periodLabel}</p>
        <p className="text-2xl font-semibold text-foreground">
          {formatTinybarAsHbar(IMPACT.totalTinybars)} HBAR
        </p>
        <UsdHint hbar={Number(formatTinybarAsHbar(IMPACT.totalTinybars))} />
        <p className="text-sm text-muted">
          {IMPACT.sessionCount} forfeits funded this cause. No leaderboard, no
          individual totals, and never a callout of who slipped.
        </p>
      </div>

      {pendingForfeitHbar !== null ? (
        <p className="text-sm text-muted">
          If this session stands, {pendingForfeitHbar} HBAR{' '}
          <UsdHint hbar={pendingForfeitHbar} className="inline" />{' '}
          joins your circle’s total after the appeal window. The good still counts, but your name
          does not go with it.
        </p>
      ) : (
        <p className="text-sm text-muted">
          Your circle stays private. We show what you have funded together, not
          a list of members — and never who slipped.
        </p>
      )}
    </section>
  );
};
