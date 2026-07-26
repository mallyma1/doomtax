import { Page } from '@/components/PageLayout';
import { SessionFlow } from '@/components/SessionFlow';

export default function Home() {
  return (
    <Page>
      <Page.Main className="flex flex-col">
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
          <SessionFlow />
        </div>
      </Page.Main>
    </Page>
  );
}
