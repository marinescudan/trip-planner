<script setup lang="ts">
/**
 * Root component. `UApp` provides Nuxt UI's TooltipProvider context, toaster
 * portal, and overlay layer — required for any descendant using
 * <UTooltip>/<UModal>/<USlideover>.
 *
 * `useHead` injects iOS PWA meta tags + apple-touch-icon. The PWA module
 * already sets `theme-color` via the manifest, but iOS Safari only honours
 * its own legacy meta tags for status-bar tinting and home-screen install,
 * so they are emitted manually here.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/pwa/spec.md  (Theme color &
 *   status bar)
 */

useHead({
  htmlAttrs: { lang: 'en' },
  meta: [
    { name: 'theme-color', content: '#0369a1' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    { name: 'apple-mobile-web-app-title', content: 'Trip' },
    { name: 'mobile-web-app-capable', content: 'yes' },
  ],
  link: [
    { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
    { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icons/icon-192.png' },
    { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/icons/icon-512.png' },
  ],
})
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </UApp>
</template>
