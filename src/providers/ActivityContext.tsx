'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';

export type HederaActivity = 'idle' | 'active' | 'settled';
export type ZeroGActivity = 'idle' | 'active';

interface ActivityState {
  world: boolean;
  hedera: HederaActivity;
  zeroG: ZeroGActivity;
  setHedera: (v: HederaActivity) => void;
  setZeroG: (v: ZeroGActivity) => void;
}

const ActivityContext = createContext<ActivityState>({
  world: false,
  hedera: 'idle',
  zeroG: 'idle',
  setHedera: () => {},
  setZeroG: () => {},
});

export function ActivityProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [hedera, setHedera] = useState<HederaActivity>('idle');
  const [zeroG, setZeroG] = useState<ZeroGActivity>('idle');

  return (
    <ActivityContext.Provider
      value={{
        world: status === 'authenticated',
        hedera,
        zeroG,
        setHedera,
        setZeroG,
      }}
    >
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  return useContext(ActivityContext);
}
