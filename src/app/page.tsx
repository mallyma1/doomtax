import { AppHeader } from '@/components/AppHeader';
import { Page } from '@/components/PageLayout';
import { PoweredBy } from '@/components/PoweredBy';
import { SessionFlow } from '@/components/SessionFlow';
import { VisitorGutter, VisitorPanel } from '@/components/VisitorPanel';

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
      {/*
        On desktop, outside World App, a project panel sits beside the flow.
        It is hidden below lg, so the phone layout is the one it always was.
      */}
      <Page.Main className="flex flex-col">
        <div className="mx-auto flex w-full max-w-6xl flex-1 lg:gap-12 xl:gap-16">
          <VisitorPanel />
          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
            <SessionFlow
              selfieAction={process.env.WORLD_SELFIE_ACTION_ID ?? null}
            />
          </div>
        </div>
      </Page.Main>
      <Page.Footer className="pt-2">
        <div className="mx-auto flex w-full max-w-6xl lg:gap-12 xl:gap-16">
          <VisitorGutter />
          <div className="min-w-0 flex-1">
            <PoweredBy />
          </div>
        </div>
      </Page.Footer>
    </Page>
  );
}
