import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// vite-plugin-pwa crash en dev avec des chemins contenant des espaces (createRequire bug)
// On le charge uniquement en build
const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('build')

export default defineConfig(async () => {
  const plugins = [react()]

  if (isProd) {
    const { VitePWA } = await import('vite-plugin-pwa')
    plugins.push(
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'Kaku — Flashcards SRS',
          short_name: 'Kaku',
          description: 'Application de révision par répétition espacée',
          theme_color: '#6C5CE7',
          background_color: '#0f0f12',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          icons: [
            { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        },
      })
    )
  }

  return {
    plugins,
    server: {
      port: 5175,
      host: true, // écoute sur 0.0.0.0 → accessible depuis le réseau local
    },
  }
})
