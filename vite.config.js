import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
  base: '/fincheck/',
  server: {
    port: parseInt(process.env.PORT) || 5173,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Fin Check',
        short_name: 'Fin Check',
        description: 'Personal Finance Manager',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/fincheck/',
        start_url: '/fincheck/',
        icons: [
          { src: '/fincheck/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/fincheck/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/fincheck/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Serve the cached app shell for any route when offline (SPA).
        navigateFallback: '/fincheck/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          // Cache the web font so text renders correctly offline after first load.
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // NOTE: Firestore is deliberately NOT cached by the service worker.
          // Its SDK manages offline via persistentLocalCache; intercepting its
          // transport here would add latency and can break the realtime channel.
        ],
      }
    })
  ]
})
