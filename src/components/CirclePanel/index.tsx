import {
  DEMO_CIRCLE,
  DEMO_CIRCLE_ACTIVITY,
  deriveCircleImpact,
  formatTinybarAsHbar,
} from '@/lib/circle';

const IMPACT = deriveCircleImpact(DEMO_CIRCLE, DEMO_CIRCLE_ACTIVITY, 'This week');

export const CirclePanel = ({
  pendingForfeitHbar,
}: {
  pendingForfeitHbar: number | null;
}) => {
  return (
    <section className="w-full max-w-xl rounded-2xl border border-border bg-surface p-4 space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Circle</h2>
        <p className="text-sm text-muted">
          Social, not competitive. Circles share one cause and show only the collective total.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-xs uppercase tracking-wide text-faint">Circle</p>
          <p className="text-sm font-medium text-foreground">{DEMO_CIRCLE.name}</p>
          <p className="text-xs text-faint">{DEMO_CIRCLE.memberSessionKeys.length} members</p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-xs uppercase tracking-wide text-faint">Shared cause</p>
          <p className="text-sm font-medium text-foreground">{DEMO_CIRCLE.causeName}</p>
          <p className="text-xs text-faint">Account {DEMO_CIRCLE.causeAccountId}</p>
        </div>
      </div>

      <div className="rounded-lg border border-accent/30 bg-accent/10 p-3">
        <p className="text-xs uppercase tracking-wide text-accent">{IMPACT.periodLabel}</p>
        <p className="text-2xl font-semibold text-foreground">
          {formatTinybarAsHbar(IMPACT.totalTinybars)} HBAR
        </p>
        <p className="text-sm text-muted">
          {IMPACT.sessionCount} forfeits funded this cause. No leaderboard, no per-member totals,
          and never who slipped.
        </p>
      </div>

      {pendingForfeitHbar !== null ? (
        <p className="text-sm text-muted">
          Your latest slipped session is parked in the pending account. If it stands,{' '}
          {pendingForfeitHbar} HBAR will join the collective total quietly once the separate
          charity sweep runs, without naming anyone.
        </p>
      ) : (
        <p className="text-sm text-muted">
          Membership stays off-chain. The collective total is derived client-side from known member
          session IDs, never from an HCS membership list.
        </p>
      )}
    </section>
  );
};
