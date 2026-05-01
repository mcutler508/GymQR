import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
};

/** Stylized iPhone-ish frame. Pure CSS, no images. */
export function PhoneFrame({ children, className = '' }: Props) {
  return (
    <div
      className={`relative mx-auto w-[280px] sm:w-[320px] aspect-[9/19] rounded-[44px] bg-surface card-sheen border border-line/80 p-3 ${className}`}
    >
      {/* Outer subtle highlight */}
      <div className="pointer-events-none absolute inset-0 rounded-[44px] ring-1 ring-inset ring-white/5" />
      {/* Notch */}
      <div className="absolute left-1/2 top-3 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-canvas" />
      {/* Screen */}
      <div className="relative h-full w-full overflow-hidden rounded-[34px] bg-canvas">
        {children}
      </div>
    </div>
  );
}
