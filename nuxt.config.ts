// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxt/fonts', '@vite-pwa/nuxt'],
  css: ['~/assets/css/main.css'],
  nitro: {
    preset: 'vercel',
  },
})
