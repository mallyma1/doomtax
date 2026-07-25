import { Page } from '@/components/PageLayout';
import { AuthButton } from '../components/AuthButton';
import { SessionFlow } from '@/components/SessionFlow';

export default function Home() {
  return (
    <Page>
      <Page.Main className="flex flex-col items-center justify-center">
        <AuthButton />
        <SessionFlow />
      </Page.Main>
    </Page>
  );
}
