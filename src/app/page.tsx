import { AuthButton } from '@/components/AuthButton';
import { Page } from '@/components/PageLayout';
import { SessionFlow } from '@/components/SessionFlow';
import { UserInfo } from '@/components/UserInfo';
import { auth } from '@/auth';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';

export default async function Home() {
  const session = await auth();

  return (
    <Page>
      <Page.Header>
        <TopBar title="DoomTax" />
      </Page.Header>
      <Page.Main className="flex flex-col items-center gap-6 pb-12">
        {session ? <UserInfo /> : <AuthButton />}
        <SessionFlow />
      </Page.Main>
    </Page>
  );
}
