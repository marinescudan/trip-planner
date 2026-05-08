// Runtime app config — accessible via `useAppConfig()`.
// Font configuration here is referenced from CSS / Tailwind setup later
// (Phase 9.5). The @nuxt/fonts module auto-discovers `font-family`
// declarations in CSS, so listing the names below also seeds the font
// loader.
export default defineAppConfig({
  fonts: {
    sans: 'Inter',
    display: 'Fraunces',
  },
})
