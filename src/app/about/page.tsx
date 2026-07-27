import { AppHeader } from '@/components/AppHeader';
import { Page } from '@/components/PageLayout';
import { PoweredBy } from '@/components/PoweredBy';
import { WORLD_MINI_APP_URL } from '@/lib/world';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';

interface TitledItem {
  title: string;
  body: string;
}

const ONBOARDING_STEP_KEYS = ['step1', 'step2', 'step3', 'step4'] as const;

export default async function AboutPage() {
  const t = await getTranslations('About');
  const tc = await getTranslations('Common');
  const ta = await getTranslations('AuthButton');

  const benefits = t.raw('benefits') as string[];
  const comparisons = t.raw('comparisons') as TitledItem[];
  const steps = t.raw('steps') as TitledItem[];

  return (
    <Page>
      <Page.Header>
        <AppHeader variant="about" />
      </Page.Header>
      <Page.Main className="flex flex-col">
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 pb-8">
          <section className="rounded-3xl border border-border bg-surface px-5 py-6">
            <p className="mono-caption text-xs uppercase tracking-[0.18em] text-accent">
              {t('pageTitle')}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {t('heroTitle')}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {t('heroBody')}
            </p>
          </section>

          <section className="rounded-3xl border border-border bg-surface px-5 py-6">
            <h2 className="text-xl font-semibold text-foreground">
              {t('whyTitle')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {t('whyBody')}
            </p>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2">
                  <span
                    className="mt-2 size-1.5 rounded-full bg-accent"
                    aria-hidden="true"
                  />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border border-border bg-surface px-5 py-6">
            <h2 className="text-xl font-semibold text-foreground">
              {t('differentTitle')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {t('differentBody')}
            </p>
            <div className="mt-4 grid gap-3">
              {comparisons.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-border bg-background px-4 py-4"
                >
                  <h3 className="text-base font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-surface px-5 py-6">
            <h2 className="text-xl font-semibold text-foreground">
              {t('howTitle')}
            </h2>
            <div className="mt-4 grid gap-3">
              {steps.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-border bg-background px-4 py-4"
                >
                  <p className="mono-caption text-xs uppercase tracking-[0.16em] text-faint">
                    {t('stepLabel', { number: index + 1 })}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-surface px-5 py-6">
            <h2 className="text-xl font-semibold text-foreground">
              {t('gentleTitle')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {t('gentleBody')}
            </p>
          </section>

          <section className="rounded-3xl border border-border bg-surface px-5 py-6">
            <h2 className="text-xl font-semibold text-foreground">
              {t('privacyTitle')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {t('privacyBody')}
            </p>
          </section>

          <section className="rounded-3xl border border-border bg-surface px-5 py-6">
            <h2 className="text-xl font-semibold text-foreground">
              {t('openSourceTitle')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {t('openSourceBody')}
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-surface px-5 py-6">
            <p className="mono-caption text-accent">{t('gettingInEyebrow')}</p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">
              {t('gettingInTitle')}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted max-w-[36ch]">
              {t('gettingInBody')}
            </p>
            <div className="mt-5 flex justify-center">
              <div className="rounded-2xl bg-white p-3">
                <Image
                  src="/qr-doomtax.png"
                  alt={tc('qrAlt')}
                  width={180}
                  height={180}
                />
              </div>
            </div>
            <ol className="mt-5 space-y-3">
              {ONBOARDING_STEP_KEYS.map((key, index) => (
                <li key={key} className="flex gap-3 text-sm text-muted">
                  <span className="mono-caption mt-0.5 shrink-0 text-faint">
                    {index + 1}.
                  </span>
                  <span className="max-w-[36ch] leading-relaxed">
                    {ta(key)}
                    {key === 'step1' && (
                      <>
                        {' '}
                        <a
                          href="https://world.org/download"
                          className="text-foreground underline underline-offset-4"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {ta('step1LinkLabel')}
                        </a>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-5 border-t border-border pt-4 text-center text-sm text-muted">
              {tc('onYourPhone')}{' '}
              <a href={WORLD_MINI_APP_URL} className="font-medium text-foreground underline underline-offset-4">
                {tc('openInWorldApp')}
              </a>
            </div>
          </section>

          <section className="rounded-3xl border border-accent/30 bg-accent/10 px-5 py-6">
            <h2 className="text-xl font-semibold text-foreground">
              {t('readyTitle')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {t('readyBody')}
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-black"
              >
                {t('startSession')}
              </Link>
              <a
                href={WORLD_MINI_APP_URL}
                className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-semibold text-foreground"
              >
                {t('openInWorldApp')}
              </a>
            </div>
          </section>
        </div>
      </Page.Main>
      <Page.Footer className="pt-0">
        <PoweredBy />
      </Page.Footer>
    </Page>
  );
}
