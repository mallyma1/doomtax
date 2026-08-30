'use client';

import { ReactNode, useEffect, useRef } from 'react';

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

  useEffect(() => {
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
  }, [onClose]);

  return (
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
    </div>
  );
};
