import { Page } from '@/components/PageLayout';
import { PoweredBy } from '@/components/PoweredBy';
import { WORLD_MINI_APP_URL } from '@/lib/world';
import Link from 'next/link';

const HOW_IT_WORKS = [
  {
    title: 'Name the session',
    body: 'Say what you actually want to do. The verdict is judged against that sentence, not against a vague idea of productivity.',
  },
  {
    title: 'Put a small stake on it',
    body: 'A stake makes the commitment concrete. Research on commitment devices shows that even a small financial consequence meaningfully increases follow-through — the amount matters less than the act of choosing it.',
  },
  {
    title: 'Finish, then show your proof',
    body: 'When the session ends, you share what you got done. That can be a short note, summary, or artifact from the work itself.',
  },
  {
    title: 'Keep it or let it go',
    body: 'If you kept your word, your stake comes back. If you slipped, the forfeit goes to a shared cause — never to us.',
  },
] as const;

const BENEFITS = [
  'Less doomscrolling and fewer “where did the last hour go?” sessions.',
  'A cleaner start because you choose one intention instead of ten competing tabs.',
  'A clearer finish — the session ends with an actual answer, not a vague sense of whether the time was well spent.',
] as const;

const COMPARISONS = [
  {
    title: 'Timers and to-do apps',
    body: 'Great for structure, but they still rely on willpower at the exact moment you are most tempted to drift.',
  },
  {
    title: 'Blockers and lockout tools',
    body: 'Useful if you want hard walls. DoomTax takes a lighter approach: it asks for a real commitment without policing your whole device.',
  },
  {
    title: 'Accountability apps',
    body: 'Many make your struggle visible to someone else. DoomTax keeps the session personal and private, while still making the outcome matter.',
  },
] as const;

export default function AboutPage() {
  return (
    <Page>
      <Page.Main className="flex flex-col">
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 pb-8">
          <Link
            href="/"
            className="w-fit text-sm font-medium text-muted underline underline-offset-4"
          >
            Back to session
          </Link>

          <section className="rounded-3xl border border-border bg-surface px-5 py-6">
            <p className="mono-caption text-xs uppercase tracking-[0.18em] text-accent">
              About DoomTax
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              A kinder way to turn intention into follow-through
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              DoomTax is a focus tool grounded in commitment-device research
              from behavioural economics. You name one task, put a small stake
              behind it, and get an honest verdict at the end.
            </p>
          </section>

          <section className="rounded-3xl border border-border bg-surface px-5 py-6">
            <h2 className="text-xl font-semibold text-foreground">
              Why this method works
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              The mechanism is called a commitment device — a voluntary
              constraint you place on your future self. Ariel Procaccia and
              colleagues have shown that pre-commitment with financial stakes
              significantly improves follow-through compared to intention alone.
              Ariely and Wertenbroch&apos;s deadline research found the same
              pattern: self-imposed consequences work, and they work better when
              the person chose them. The stake here is small by design. The
              research suggests that the act of committing matters more than
              the size of what&apos;s on the line.
            </p>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
              {BENEFITS.map((benefit) => (
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
              How DoomTax feels different
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Most focus tools help you plan or block distractions. DoomTax is
              for after that — when you know what you want to do and the gap
              between intending and actually doing it is what needs closing.
            </p>
            <div className="mt-4 grid gap-3">
              {COMPARISONS.map((item) => (
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
              How a session works
            </h2>
            <div className="mt-4 grid gap-3">
              {HOW_IT_WORKS.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-border bg-background px-4 py-4"
                >
                  <p className="mono-caption text-xs uppercase tracking-[0.16em] text-faint">
                    Step {index + 1}
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
              Gentle by design
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              DoomTax is not here to shame you. If the evidence is unclear, the
              call should fall your way. You can use amnesty before settlement,
              and there is an appeal window when a slipped session feels wrong.
              Wins should feel energizing. Losses should stay quiet.
            </p>
          </section>

          <section className="rounded-3xl border border-border bg-surface px-5 py-6">
            <h2 className="text-xl font-semibold text-foreground">
              What we see — and what we do not
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              We only use the intention you wrote, the artifact you submit at
              the end, and simple integrity signals from this page like focus
              time and interruptions. We do not see your screen, your browsing,
              your keystrokes, or what you do in other apps.
            </p>
          </section>

          <section className="rounded-3xl border border-border bg-surface px-5 py-6">
            <h2 className="text-xl font-semibold text-foreground">
              Open source, on purpose
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              DoomTax is open source because trust matters here. You should be
              able to inspect how the flow works, what gets sent where, and what
              the app refuses to collect. That transparency is part of the
              product, not an extra.
            </p>
          </section>

          <section className="rounded-3xl border border-accent/30 bg-accent/10 px-5 py-6">
            <h2 className="text-xl font-semibold text-foreground">
              Ready to try it?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Start with a small stake. The research is clear that the size
              matters less than making the commitment real — pick something you
              genuinely intend to finish in the next session.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-black"
              >
                Start a session
              </Link>
              <a
                href={WORLD_MINI_APP_URL}
                className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-semibold text-foreground"
              >
                Open in World App
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
