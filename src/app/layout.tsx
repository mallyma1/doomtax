import { auth } from '@/auth';
import { RTL_LOCALES } from '@/i18n/config';
import ClientProviders from '@/providers';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata, Viewport } from 'next';
import { getLocale, getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import './globals.css';

/**
 * Remaps the UI kit's grey ramp for a dark canvas.
 *
 * @worldcoin/mini-apps-ui-kit-react ships a light-page scale: gray-0 is white
 * (button fills, sheet backgrounds) and gray-900 is near-black (label text).
 * Unremapped, that renders white slabs and an invisible active tab label.
 * Applied inline because the kit's stylesheet is unlayered and injected after
 * globals.css, so no rule in that file can win the cascade.
 *
 * gray-300 is the disabled-label tone. The first thing anyone sees on the
 * commitment screen is a disabled "Start session", and against gray-100 the
 * original value measured 1.44:1 — not dimmed but gone, so the blocked action
 * did not say what it was. Raised to roughly 3.2:1: legible, still plainly
 * inactive next to the 17:1 of the enabled button.
 */
const KIT_DARK_RAMP = {
  '--gray-0': '19 18 24',
  '--gray-50': '24 23 30',
  '--gray-100': '28 26 34',
  '--gray-200': '38 36 48',
  '--gray-300': '110 104 122',
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
  const locale = await getLocale();
  const messages = await getMessages();
  const isRtl = RTL_LOCALES.includes(locale as 'ar' | 'ur');
  const worldAppId =
    process.env.NEXT_PUBLIC_APP_ID?.trim() ||
    process.env.WORLD_APP_ID?.trim() ||
    null;
  return (
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'}>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} `}
        style={KIT_DARK_RAMP}
      >
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ClientProviders session={session} worldAppId={worldAppId}>
            {children}
          </ClientProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
