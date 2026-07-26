import { Page } from '@/components/PageLayout';
import { SessionFlow } from '@/components/SessionFlow';

export default function Home() {
  return (
    <Page>
      <Page.Main className="flex flex-col">
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
          {/*
            Read here rather than in SessionFlow: this is a server component,
            so the action stays a server-read env var instead of needing a
            NEXT_PUBLIC_ twin.
          */}
          <SessionFlow
            selfieAction={process.env.WORLD_SELFIE_ACTION_ID ?? null}
          />
        </div>
      </Page.Main>
    </Page>
  );
}
