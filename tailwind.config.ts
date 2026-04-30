import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        'line-soft': 'rgb(var(--line-soft) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        'muted-strong': 'rgb(var(--muted-strong) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-ink': 'rgb(var(--accent-ink) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft) / <alpha-value>)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
        sans: ['var(--font-body)'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        card: 'var(--radius-card)',
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      // Theme-scoped variants — apply when wrapped in [data-theme="X"].
      // Use these for theme-specific type personality (display sizes,
      // italic/uppercase casing) that doesn't fit semantic color tokens.
      addVariant('halogen', '[data-theme="halogen"] &');
      addVariant('concrete', '[data-theme="concrete"] &');
      addVariant('locker', '[data-theme="locker-room"] &');
      addVariant('athletic', '[data-theme="athletic"] &');
    }),
  ],
};

export default config;
