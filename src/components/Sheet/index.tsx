'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface SheetProps {
  /** Called on Escape, backdrop tap, and the grabber's close affordance. */
  onClose: () => void;
  /** ID of the element naming this sheet. Prefer this over `label`. */
  labelledBy?: string;
  /** Accessible name, when no visible heading exists to point at. */
  label?: string;
  /** Accessible name for the backdrop's dismiss control. */
  closeLabel: string;
  children: ReactNode;
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * The bottom sheet every modal surface in the app is built from.
 *
 * Hand-rolled rather than the kit's Drawer: that component bundles vaul built
 * against React 18 and its portal never mounts under React 19. Amnesty is one
 * of these sheets, and the control that guarantees a user can always get their
 * stake back should not depend on a mismatched transitive dependency.
 *
 * Consolidated from four separate copies of this chrome. They had drifted —
 * different grabber widths, different max heights — and none of them trapped
 * focus, so Tab walked out of the dialog and into the page behind it while the
 * backdrop still swallowed clicks. Fixing that once here fixes it everywhere.
 *
 * Rendered into <body>. `position: fixed` resolves against the nearest ancestor
 * with a transform, and `.animate-fade-up` keeps an identity transform after it
 * finishes (`animation-fill-mode: both`), so a sheet opened from inside an
 * animated phase was not a modal at all: the explainer opened from the verdict
 * measured 342x937 at y=-387, its heading scrolled off the top of the screen,
 * inset from both edges, with the page showing through a backdrop that only
 * covered a band of the viewport. A portal is the only placement that cannot be
 * captured by whatever a caller happens to be nested in.
 */
export const Sheet = ({
  onClose,
  labelledBy,
  label,
  closeLabel,
  children,
}: SheetProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  // Whatever opened the sheet, so focus can go home when it closes.
  const openerRef = useRef<HTMLElement | null>(null);
  // document.body does not exist during the server render.
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // The portal has not rendered on the first pass, so the panel node does not
    // exist yet. Without waiting for it, this captures a null ref: nothing takes
    // focus and the Tab handler below bails out, silently disabling the trap.
    if (!mounted) return;

    openerRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panel) return;

      // Keep Tab inside the dialog. Without this the focus ring walks behind
      // the backdrop onto controls the user cannot see or click.
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      openerRef.current?.focus?.();
    };
  }, [onClose, mounted]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        tabIndex={-1}
        className="animate-sheet-up relative max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-surface px-6 pb-[max(2.25rem,env(safe-area-inset-bottom))] pt-5 outline-none"
      >
        <div
          className="mx-auto mb-5 h-1 w-9 rounded-full bg-border"
          aria-hidden="true"
        />
        {children}
      </div>
    </div>,
    document.body,
  );
};
