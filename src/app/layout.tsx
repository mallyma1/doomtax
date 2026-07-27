import { auth } from '@/auth';
import ClientProviders from '@/providers';
import '@worldcoin/mini-apps-ui-kit-react/styles.css';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata, Viewport } from 'next';
import './globals.css';

/**
 * Remaps the UI kit's grey ramp for a dark canvas.
 *
 * @worldcoin/mini-apps-ui-kit-react ships a light-page scale: gray-0 is white
 * (button fills, sheet backgrounds) and gray-900 is near-black (label text).
 * Unremapped, that renders white slabs and an invisible active tab label.
 * Applied inline because the kit's stylesheet is unlayered and injected after
 * globals.css, so no rule in that file can win the cascade.
 */
const KIT_DARK_RAMP = {
  '--gray-0': '19 18 24',
  '--gray-50': '24 23 30',
  '--gray-100': '28 26 34',
  '--gray-200': '38 36 48',
  '--gray-300': '56 53 68',
  '--gray-350': '99 93 108',
  '--gray-400': '123 117 133',
  '--gray-500': '155 149 163',
  '--gray-700': '214 210 219',
  '--gray-900': '247 245 243',
} as React.CSSProperties;

export const viewport: Viewport = {
  themeColor: '#08070a',
  // The session clock must stay put when the artifact field takes focus.
  maximumScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'DoomTax',
  description:
    'Stake on a focus session, state your intention, and let a private AI coach decide if you kept it. Forfeits go to charity, never to us.',
  metadataBase: new URL('https://doomtax.vercel.app'),
  openGraph: {
    title: 'DoomTax',
    description:
      'Stake on a focus session, state your intention, and let a private AI coach decide if you kept it. Forfeits go to charity, never to us.',
    images: ['/promo/og-card.png'],
  },
  twitter: {
    card: 'summary_large_image',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DoomTax',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const worldAppId =
    process.env.NEXT_PUBLIC_APP_ID?.trim() ||
    process.env.WORLD_APP_ID?.trim() ||
    null;
  return (
    <html lang="en">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} `}
        style={KIT_DARK_RAMP}
      >
        <ClientProviders session={session} worldAppId={worldAppId}>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
