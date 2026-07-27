import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

/**
 * The single header row used by every screen.
 *
 * Deliberately hand-rolled rather than the kit's TopBar: TopBar assumes a light
 * theme and ships its own vertical padding, which doubled up against the
 * Page.Header padding and produced the misaligned white bar.
 */
export const AppHeader = async ({
  variant = 'home',
}: {
  variant?: 'home' | 'about';
}) => {
  const t = await getTranslations('Header');

  return (
    <div className="flex w-full items-center justify-between gap-3">
      <Link href="/" className="-my-3 flex items-center gap-2 py-3">
        <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
        <span className="font-semibold tracking-tight text-foreground">
          {t('wordmark')}
        </span>
      </Link>

      <div className="flex items-center gap-3">
        <span className="mono-caption rounded-full border border-border px-2 py-0.5 text-[10px] text-faint">
          {t('testnet')}
        </span>
        <LanguageSwitcher />
        <Link
          href={variant === 'about' ? '/' : '/about'}
          className="-my-3 py-3 text-sm text-muted transition-colors hover:text-foreground"
        >
          {variant === 'about' ? t('backToSession') : t('about')}
        </Link>
      </div>
    </div>
  );
};
