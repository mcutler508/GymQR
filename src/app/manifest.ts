import type { MetadataRoute } from 'next';

// Installable PWA: launching from the home screen keeps the camera permission
// sticky on iOS and gives members a full-screen, app-like log loop.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RepetoIQ',
    short_name: 'RepetoIQ',
    description: 'Scan a machine, see your last lift, log your set.',
    start_url: '/me',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      { src: '/repetoIQicon.png', sizes: '952x952', type: 'image/png', purpose: 'any' },
    ],
  };
}
