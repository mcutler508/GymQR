import { Inter, Fraunces, Barlow_Condensed, IBM_Plex_Mono } from 'next/font/google';

// Base body font — used everywhere as default sans.
export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Halogen theme display font — editorial serif.
export const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['opsz'],
});

// Concrete theme display font — heavy condensed.
export const barlow = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '700', '900'],
  variable: '--font-barlow',
  display: 'swap',
});

// Mono used by every theme for kickers / dates / slugs.
export const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

/** Joined className that exposes every font as a CSS variable on a wrapper. */
export const allFontVariables = [
  inter.variable,
  fraunces.variable,
  barlow.variable,
  plexMono.variable,
].join(' ');
