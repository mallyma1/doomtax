import { AuthButton } from '@/components/AuthButton';
import { Page } from '@/components/PageLayout';
import { PoweredBy } from '@/components/PoweredBy';
import { SessionFlow } from '@/components/SessionFlow';
import { UserInfo } from '@/components/UserInfo';
import { auth } from '@/auth';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { WORLD_MINI_APP_URL } from '@/lib/world';
import Link from 'next/link';

export default async function Home() {
  const session = await auth();

  return (
    <Page>
      <Page.Header>
        <TopBar title="DoomTax" />
      </Page.Header>
      <Page.Main className="flex flex-col items-center gap-6 pb-12">
        {session ? <UserInfo /> : <AuthButton />}
        <SessionFlow selfieAction={process.env.WORLD_SELFIE_ACTION_ID ?? null} />
      </Page.Main>
      <Page.Footer className="pt-0">
        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-2 text-center text-sm text-muted">
          <div>
            Open DoomTax in World App:{' '}
            <a
              href={WORLD_MINI_APP_URL}
              className="font-medium text-foreground underline underline-offset-4"
            >
              world.org/mini-app
            </a>
          </div>
          <Link
            href="/about"
            className="font-medium text-foreground underline underline-offset-4"
          >
            What DoomTax is and why it works
          </Link>
        </div>
        <PoweredBy />
      </Page.Footer>
    </Page>
  );
}
