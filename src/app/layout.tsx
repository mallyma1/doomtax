import { auth } from '@/auth';
import ClientProviders from '@/providers';
import '@worldcoin/mini-apps-ui-kit-react/styles.css';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DoomTax',
  description:
    'Stake on a focus session, state your intention, and let a private AI coach decide if you kept it. Forfeits go to charity, never to us.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} `}>
        <ClientProviders session={session}>{children}</ClientProviders>
      </body>
    </html>
  );
}
