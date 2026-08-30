import { AppHeader } from '@/components/AppHeader';
import { Page } from '@/components/PageLayout';
import { PoweredBy } from '@/components/PoweredBy';
import { SessionFlow } from '@/components/SessionFlow';

export default function Home() {
  return (
    <Page>
      <Page.Header>
        <AppHeader variant="home" />
      </Page.Header>
      {/*
        The session flow owns the whole main area and sizes itself to it, so
        each phase can anchor its primary action to the bottom of the screen
        rather than to the bottom of its own content.
      */}
      <Page.Main className="flex flex-col">
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
          <SessionFlow
            selfieAction={process.env.WORLD_SELFIE_ACTION_ID ?? null}
          />
        </div>
      </Page.Main>
      <Page.Footer className="pt-2">
        <PoweredBy />
      </Page.Footer>
    </Page>
  );
}
