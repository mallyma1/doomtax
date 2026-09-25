'use client';

import { DEMO_MODE, SESSION_DURATION_SECONDS } from '@/lib/session';
import { WORLD_MINI_APP_URL } from '@/lib/world';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

const REPO_URL = 'https://github.com/mallyma1/doomtax';

const DOC_LINKS = [
  { key: 'linkArchitecture', href: `${REPO_URL}/blob/main/docs/ARCHITECTURE.md` },
  { key: 'linkNotBuilt', href: `${REPO_URL}/blob/main/NOT-BUILT.md` },
  { key: 'linkAiUsage', href: `${REPO_URL}/blob/main/AI-USAGE.md` },
  { key: 'linkDocs', href: `${REPO_URL}/blob/main/docs/README.md` },
] as const;

const SCREENSHOTS = [
  { src: '/promo/square-1-intro.png', altKey: 'shotIntroAlt' },
  { src: '/promo/square-2-live.png', altKey: 'shotLiveAlt' },
] as const;

/**
 * Hides with the panel, so the session column and the footer pills stay
 * centred on the same axis whether or not the panel is showing.
 */
export const VisitorGutter = () => {
  const { isInstalled } = useMiniKit();
  if (isInstalled === true) return null;
  return <div className="hidden shrink-0 lg:block lg:w-[440px]" aria-hidden="true" />;
};

/**
 * What a desktop visitor needs before the session flow makes sense.
 *
 * The root is a phone screen: one headline, one button, lots of dark. Inside
 * World App that is right. On a laptop it left a first-time visitor with no
 * idea what the project is, whether the button works outside World App (it
 * does, settlement is unauthenticated by design), or where the code lives.
 *
 * Desktop only (lg and up), so no phone layout changes, and never inside World
 * App. `isInstalled` is undefined until MiniKit's install check runs, so the
 * panel renders from the server and only disappears once World App is
 * confirmed. The other way round, every desktop visitor would watch the
 * session column jump sideways on load.
 */
export const VisitorPanel = () => {
  const { isInstalled } = useMiniKit();
  const t = useTranslations('Visitor');
  const tc = useTranslations('Common');

  if (isInstalled === true) return null;

  const duration =
    SESSION_DURATION_SECONDS < 60
      ? tc('secondsCount', { count: SESSION_DURATION_SECONDS })
      : tc('minutesCount', { count: Math.round(SESSION_DURATION_SECONDS / 60) });

  return (
    <aside
      aria-labelledby="visitor-title"
      className="relative hidden shrink-0 lg:block lg:w-[440px]"
    >
      {/*
        Absolutely filled, so the panel never sets the row's height. The
        session column anchors its primary action to the bottom of the main
        area; a panel taller than that area would push New session below the
        fold. On a short window the panel scrolls on its own instead, and the
        auto margins centre it without clipping its top when it does.
      */}
      <div className="absolute inset-0 flex flex-col overflow-y-auto py-2">
        <div className="card-raised my-auto rounded-3xl border border-border bg-surface px-6 py-5">
          <p className="mono-caption text-accent">{t('eyebrow')}</p>
          <h2
            id="visitor-title"
            className="mt-2.5 text-2xl font-semibold leading-tight tracking-tight text-foreground"
          >
            {t('title')}
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-muted">{t('body')}</p>

          {/* Dropped on short windows, where they would push the links out of
              view; the live app beside the panel shows the same screens. */}
          <div className="mt-4 hidden grid-cols-2 gap-3 [@media(min-height:920px)]:grid">
            {SCREENSHOTS.map((shot) => (
              <div
                key={shot.src}
                className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-background"
              >
                {/* 4:5 crops the square captures at the sides, which trims the
                    dev-tool badges in their corners without touching the UI. */}
                <Image
                  src={shot.src}
                  alt={t(shot.altKey)}
                  fill
                  sizes="200px"
                  className="object-cover"
                  priority
                />
              </div>
            ))}
          </div>

          <p className="mt-4 flex gap-2.5 text-sm leading-relaxed text-muted">
            <span
              className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent"
              aria-hidden="true"
            />
            <span>
              <span className="font-medium text-foreground">{t('tryTitle')}</span>{' '}
              {t('tryBody', { duration })}
              {DEMO_MODE && <> {t('tryDemoNote')}</>}
            </span>
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={WORLD_MINI_APP_URL}
              className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-black"
            >
              {t('openInWorldApp')}
            </a>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:border-muted"
            >
              {t('linkSource')}
            </a>
          </div>

          <ul className="mt-4 flex flex-wrap gap-x-3.5 gap-y-1 border-t border-border pt-3 text-sm">
            {DOC_LINKS.map((link) => (
              <li key={link.key}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[32px] items-center text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  {t(link.key)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
};
