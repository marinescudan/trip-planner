// https://nuxt.com/docs/api/configuration/nuxt-config
//
// PWA module config (`@vite-pwa/nuxt`) implements:
//   openspec/changes/init-trip-planner/specs/pwa/spec.md
//
// - registerType: 'autoUpdate' — silent SW upgrade on revisit; the
//   `usePwaUpdate()` composable surfaces a "Refresh" toast.
// - manifest values are the build-time defaults (theme/bg of Málaga trip).
//   Per the spec, the manifest does NOT change when a different trip is
//   loaded at runtime via `?trip=URL` — that is a known limitation.
// - workbox.runtimeCaching mirrors the spec table 1:1.
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxt/fonts', '@vite-pwa/nuxt'],
  css: ['~/assets/css/main.css'],
  nitro: {
    preset: 'vercel',
  },
  pwa: {
    registerType: 'autoUpdate',
    strategies: 'generateSW',
    injectRegister: 'auto',
    manifest: {
      name: 'Trip Planner',
      short_name: 'Trip',
      description: 'Offline-first travel itinerary planner',
      lang: 'en',
      theme_color: '#0369a1',
      background_color: '#fefcf9',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      scope: '/',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        {
          src: '/icons/icon-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    workbox: {
      // Pre-cache app shell. Exclude trip.json so it's served via NetworkFirst
      // — keeps install size predictable and lets the runtime rule manage TTL.
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      navigateFallback: '/',
      navigateFallbackDenylist: [/^\/api\//],
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        {
          urlPattern: ({ url, sameOrigin }) =>
            sameOrigin && url.pathname === '/trip.json',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'trip-json',
            expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: ({ url, request, sameOrigin }) =>
            sameOrigin
            && request.destination === 'image'
            && /\.(?:png|jpg|jpeg|webp|svg)$/i.test(url.pathname),
          handler: 'CacheFirst',
          options: {
            cacheName: 'same-origin-images',
            expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: /^https:\/\/[a-c]\.tile\.openstreetmap\.org\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'osm-tiles',
            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 90 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: /^https:\/\/picsum\.photos\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'picsum-photos',
            expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 90 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: /^https:\/\/upload\.wikimedia\.org\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'wikimedia-images',
            expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 90 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'unsplash-images',
            expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 90 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
    client: {
      // We surface our own toast via usePwaUpdate(); skip the module's prompt.
      installPrompt: false,
      periodicSyncForUpdates: 60 * 60,
    },
    devOptions: {
      enabled: false,
    },
  },
})
