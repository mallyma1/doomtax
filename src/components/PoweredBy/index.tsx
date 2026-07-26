const PARTNERS = [
  { name: 'Hedera', detail: 'settlement' },
  { name: '0G', detail: 'coach' },
  { name: 'World', detail: 'mini app' },
] as const;

export const PoweredBy = () => {
  return (
    <div className="mx-auto mt-4 flex w-full max-w-xl flex-col items-center gap-3 text-center">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {PARTNERS.map((partner) => (
          <span
            key={partner.name}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5"
          >
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">
              {partner.name}
            </span>
            <span className="text-xs text-faint">{partner.detail}</span>
          </span>
        ))}
      </div>
      <p className="max-w-[28rem] text-xs leading-relaxed text-faint">
        Powered by Hedera for settlement, 0G for the coach, and World for the
        Mini App experience.
      </p>
    </div>
  );
};
