'use client';

import { ExplainSheet, ExplainTopic } from '@/components/ExplainSheet';
import { useActivity } from '@/providers/ActivityContext';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

const PARTNERS: {
  name: string;
  detailKey: 'hederaDetail' | 'zeroGDetail' | 'worldDetail';
  logo: string;
  topic: ExplainTopic;
  activityKey: 'world' | 'hedera' | 'zeroG';
}[] = [
  {
    name: 'Hedera',
    detailKey: 'hederaDetail',
    logo: '/logos/hedera.svg',
    topic: 'hedera-settlement',
    activityKey: 'hedera',
  },
  {
    name: '0G',
    detailKey: 'zeroGDetail',
    logo: '/logos/0g.svg',
    topic: '0g-coach',
    activityKey: 'zeroG',
  },
  {
    name: 'World',
    detailKey: 'worldDetail',
    logo: '/logos/world.svg',
    topic: 'world-minikit',
    activityKey: 'world',
  },
];

function getPillClass(key: string, activity: ReturnType<typeof useActivity>): string {
  if (key === 'hedera') {
    if (activity.hedera === 'active') return 'pill-live';
    if (activity.hedera === 'settled') return 'pill-settled';
  }
  if (key === 'zeroG' && activity.zeroG === 'active') return 'pill-live';
  if (key === 'world' && activity.world) return 'pill-live';
  return '';
}

function getLogoClass(key: string, activity: ReturnType<typeof useActivity>): string {
  if (key === 'hedera' && activity.hedera === 'active') return 'animate-dot-live';
  if (key === 'zeroG' && activity.zeroG === 'active') return 'animate-dot-live';
  return '';
}

export const PoweredBy = () => {
  const [explain, setExplain] = useState<ExplainTopic | null>(null);
  const activity = useActivity();
  const t = useTranslations('PoweredBy');

  return (
    <div className="mx-auto mt-4 flex w-full max-w-xl flex-col items-center gap-3 text-center">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {PARTNERS.map((partner) => (
          <button
            key={partner.name}
            type="button"
            aria-label={t('learnAbout', { partner: partner.name })}
            onClick={() => setExplain(partner.topic)}
            className={`pill-interactive inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 transition-[box-shadow,border-color] duration-500 ${getPillClass(partner.activityKey, activity)}`}
          >
            <Image
              src={partner.logo}
              alt=""
              width={16}
              height={16}
              className={`size-4 opacity-80 ${getLogoClass(partner.activityKey, activity)}`}
            />
            <span className="text-sm font-medium text-foreground">
              {partner.name}
            </span>
            <span className="text-xs text-faint">{t(partner.detailKey)}</span>
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
