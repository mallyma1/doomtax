'use client';

import { ExplainSheet, ExplainTopic } from '@/components/ExplainSheet';
import Image from 'next/image';
import { useState } from 'react';

const PARTNERS: {
  name: string;
  detail: string;
  logo: string;
  topic: ExplainTopic;
}[] = [
  {
    name: 'Hedera',
    detail: 'settlement',
    logo: '/logos/hedera.svg',
    topic: 'hedera-settlement',
  },
  {
    name: '0G',
    detail: 'coach',
    logo: '/logos/0g.svg',
    topic: '0g-coach',
  },
  {
    name: 'World',
    detail: 'mini app',
    logo: '/logos/world.svg',
    topic: 'world-minikit',
  },
];

export const PoweredBy = () => {
  const [explain, setExplain] = useState<ExplainTopic | null>(null);

  return (
    <div className="mx-auto mt-4 flex w-full max-w-xl flex-col items-center gap-3 text-center">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {PARTNERS.map((partner) => (
          <button
            key={partner.name}
            type="button"
            aria-label={`Learn about ${partner.name}`}
            onClick={() => setExplain(partner.topic)}
            className="pill-interactive inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5"
          >
            <Image
              src={partner.logo}
              alt=""
              width={16}
              height={16}
              className="size-4 opacity-80"
            />
            <span className="text-sm font-medium text-foreground">
              {partner.name}
            </span>
            <span className="text-xs text-faint">{partner.detail}</span>
          </button>
        ))}
      </div>
      {/* ExplainSheet */}
      {explain !== null && (
        <ExplainSheet topic={explain} onClose={() => setExplain(null)} />
      )}
    </div>
  );
};
