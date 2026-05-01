'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = {
  pending?: boolean;
  pendingLabel?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * White-on-black premium button. Hover slides a thin accent line beneath
 * the label and lifts the button by 1px. No accent color — pure tonal.
 */
export function SubmitButton({
  pending = false,
  pendingLabel = 'Working…',
  children,
  className = '',
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={pending || rest.disabled}
      className={`group relative flex w-full items-center justify-between rounded-none border border-white bg-white px-6 py-4 text-sm font-medium uppercase tracking-[0.22em] text-black transition-all duration-300 hover:bg-black hover:text-white disabled:opacity-60 ${className}`}
    >
      <span className="relative z-10">{pending ? pendingLabel : children}</span>
      <span
        aria-hidden
        className="relative z-10 transition-transform duration-300 group-hover:translate-x-1"
      >
        →
      </span>
    </button>
  );
}
