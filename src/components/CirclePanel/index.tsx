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
    <section className="w-full rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Circle</h2>
        <p className="text-sm text-gray-700">
          Social, not competitive. Circles share one cause and show only the collective total.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-600">Circle</p>
          <p className="text-sm font-medium text-gray-900">{DEMO_CIRCLE.name}</p>
          <p className="text-xs text-gray-600">{DEMO_CIRCLE.memberSessionKeys.length} members</p>
        </div>

        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-600">Shared cause</p>
          <p className="text-sm font-medium text-gray-900">{DEMO_CIRCLE.causeName}</p>
          <p className="text-xs text-gray-600">Account {DEMO_CIRCLE.causeAccountId}</p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs uppercase tracking-wide text-amber-700">{IMPACT.periodLabel}</p>
        <p className="text-2xl font-semibold text-gray-900">
          {formatTinybarAsHbar(IMPACT.totalTinybars)} HBAR
        </p>
        <p className="text-sm text-gray-700">
          {IMPACT.sessionCount} forfeits funded this cause. No leaderboard, no per-member totals,
          and never who slipped.
        </p>
      </div>

      {pendingForfeitHbar !== null ? (
        <p className="text-sm text-gray-700">
          Your latest slipped session is parked in the pending account. If it stands,{' '}
          {pendingForfeitHbar} HBAR will join the collective total quietly once the separate
          charity sweep runs, without naming anyone.
        </p>
      ) : (
        <p className="text-sm text-gray-700">
          Membership stays off-chain — nothing about who&apos;s in this circle goes on the public
          ledger.
        </p>
      )}
    </section>
  );
};
