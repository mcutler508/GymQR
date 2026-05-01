'use client';

import { useId, useState, type InputHTMLAttributes } from 'react';

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>;

/**
 * Editorial-style input — top mono caps label, hairline underline that
 * thickens to white on focus. No box. Pure typography.
 */
export function Field({ label, value, onChange, ...rest }: Props) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  return (
    <div className="group relative">
      <label
        htmlFor={id}
        className="block font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500"
      >
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...rest}
        className="w-full bg-transparent pb-2 pt-3 font-display text-xl text-white outline-none placeholder:text-zinc-700"
      />
      {/* Static hairline */}
      <div className="h-px w-full bg-white/15" />
      {/* Animated focus underline — anchored left, scales out from origin. */}
      <div
        className="absolute bottom-0 left-0 h-px bg-white transition-transform duration-500 ease-out"
        style={{
          width: '100%',
          transform: `scaleX(${focused || value ? 1 : 0})`,
          transformOrigin: 'left',
        }}
      />
    </div>
  );
}
