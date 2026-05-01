'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'article' | 'header' | 'footer';
};

export function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = window.setTimeout(() => setRevealed(true), delay);
            io.disconnect();
            return () => window.clearTimeout(id);
          }
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [delay]);

  return (
    <Tag
      ref={ref as never}
      data-revealed={revealed ? 'true' : 'false'}
      className={`reveal ${className}`}
    >
      {children}
    </Tag>
  );
}
