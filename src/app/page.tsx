import { AppHeader } from '@/components/AppHeader';
import { AuthButton } from '@/components/AuthButton';
import { Page } from '@/components/PageLayout';
import { PoweredBy } from '@/components/PoweredBy';
import { SessionFlow } from '@/components/SessionFlow';
import { UserInfo } from '@/components/UserInfo';
import { auth } from '@/auth';

export default async function Home() {
  const session = await auth();

  return (
    <Page>
      <Page.Header>
        <AppHeader variant="home" />
      </Page.Header>
      <Page.Main className="flex flex-col items-center gap-6 pb-12">
        <div className="mx-auto w-full max-w-xl">
          {session ? <UserInfo /> : <AuthButton />}
        </div>
        <div className="mx-auto w-full max-w-xl">
          <SessionFlow selfieAction={process.env.WORLD_SELFIE_ACTION_ID ?? null} />
        </div>
      </Page.Main>
      <Page.Footer className="pb-[max(20px,env(safe-area-inset-bottom))] pt-0">
        <PoweredBy />
      </Page.Footer>
    </Page>
  );
}
