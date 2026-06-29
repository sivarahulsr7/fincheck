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
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com/,
            handler: 'NetworkFirst',
            options: { cacheName: 'firebase-cache', networkTimeoutSeconds: 5 }
          }
        ]
      }
    })
  ]
})
