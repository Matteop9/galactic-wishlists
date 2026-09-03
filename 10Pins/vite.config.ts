import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const SUPABASE_HOST = /^https:\/\/[a-z0-9-]+\.supabase\.co\//;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // NOT 'autoUpdate': an automatic reload mid-game would take the live
      // scorer's in-memory undo history with it. The app asks first.
      registerType: 'prompt',
      includeAssets: ['icons/favicon-32.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: '10 Pins',
        short_name: '10 Pins',
        description: 'The scoresheet for your bowling group',
        lang: 'en-GB',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F7F3EA',
        theme_color: '#F7F3EA',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          // Fonts: the one thing genuinely worth caching hard.
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Supabase: read-only game data, and ONLY that. This is written as
          // an allowlist by pathname rather than a denylist, because Workbox
          // caches exactly what a rule matches — which makes it structurally
          // impossible to cache /auth/v1 (a replayed token refresh means a
          // broken session), /functions/v1 (a cached scan result would be a
          // disaster), /realtime/v1, or /storage/v1/object/sign (signed URLs
          // expire, so a cached one is a dead link).
          {
            urlPattern: ({ url }: { url: URL }) =>
              SUPABASE_HOST.test(url.origin + '/') && url.pathname.startsWith('/rest/v1/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  // Port 3000 matches Supabase's default Site URL, so OAuth redirects land in dev;
  // PORT overrides it for a second local server (previews) that doesn't need OAuth.
  server: { port: Number(process.env.PORT) || 3000 },
});
