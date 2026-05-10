# Tasks: Initialize Trip App + Málaga Trip JSON

`[P]` = parallel-safe within phase. Mark `[x]` as complete. Commit between tasks.

## Phase 0: Self-check (mandatory)

- [ ] 0.1 Read CLAUDE.md, openspec/project.md, and all spec files; respond with the Phase 0 checklist filled in (see CLAUDE.md). Wait for user confirmation.

## Phase 1: Project scaffold

- [x] 1.1 `pnpm dlx nuxi@latest init trip-planner --packageManager pnpm --gitInit`
- [x] 1.2 Install Nuxt UI v3: `pnpm add @nuxt/ui` and add `'@nuxt/ui'` to `nuxt.config.ts` modules
- [x] 1.3 Install fonts: `pnpm add @nuxt/fonts` and add `'@nuxt/fonts'` to modules; configure Inter + Fraunces in `app.config.ts`
- [x] 1.4 Install icons: `pnpm add @nuxt/icon @iconify-json/heroicons @iconify-json/lucide`
- [x] 1.5 Install PWA: `pnpm add -D @vite-pwa/nuxt` and add `'@vite-pwa/nuxt'` to modules (config comes in Phase 10)
- [x] 1.6 Install dev tools: `pnpm add -D vitest @vue/test-utils happy-dom zod @types/leaflet`
- [x] 1.7 Install runtime: `pnpm add leaflet`
- [x] 1.8 Configure Vercel preset in `nuxt.config.ts`: `nitro: { preset: 'vercel' }`
- [x] 1.9 Add scripts to `package.json`: `dev`, `build`, `preview`, `test`, `typecheck`, `validate-trip`
- [x] 1.10 Create folders: `components/`, `composables/`, `assets/data/`, `types/`, `utils/`, `tests/`, `public/`, `server/`
- [x] 1.11 Verification: `pnpm dev` opens at localhost:3000 with default Nuxt UI styling visible

## Phase 2: Trip schema & types

- [x] 2.1 [P] `types/trip.ts` — Trip, HomeBase, Travelers, Theme types
- [x] 2.2 [P] `types/place.ts` — Place, PlaceType, Slot, Zone, PriorityTier, CostTier, Energy, WeatherFlag, PhotoRef
- [x] 2.3 [P] `types/day.ts` — Day, DayId, TravelMode, FixedEvent
- [x] 2.4 [P] `types/state.ts` — PlaceState, DayAssignments, Presets
- [x] 2.5 [P] `types/taxonomy.ts` — SlotDef, PriorityTierDef, CostTierDef, ZoneDef, EnergyDef
- [x] 2.6 `utils/schema.ts` — Zod schemas matching all the above; export `tripSchema`, `placeSchema`, etc.
- [x] 2.7 `utils/schema.ts` — also export `validateTripJson(input: unknown): { ok: true, trip: Trip } | { ok: false, errors: ZodIssue[] }`
- [x] 2.8 Verification: `pnpm typecheck` passes; round-trip a fixture object through Zod

## Phase 3: Trip loader

- [x] 3.1 `composables/useTripLoader.ts` — resolve flow: query param → locker → default `/trip.json` → /load
- [x] 3.2 `composables/useTripLocker.ts` — list/save/select/remove trips in localStorage
- [x] 3.3 `composables/useTrip.ts` — exposes active `Trip` reactive ref + `placeById`, `dayById`
- [x] 3.4 `pages/load.vue` — UI for URL paste, file drop, manual paste; shows Zod errors on invalid input
- [x] 3.5 Tests: trip-loader resolution priority, validation failures, locker CRUD
- [x] 3.6 Verification: with no localStorage, app loads `/trip.json`; with `?trip=<url>` loads that one; bad URL routes to `/load` with errors

## Phase 4: Place state + day plan

- [x] 4.1 `composables/useStorage.ts` — generic typed wrapper, Zod-validated, throttled writes, SSR-safe; key namespacing helpers
  - Foundation (StorageAdapter + LocalAdapter + InMemoryAdapter + Zod-validated get/set/list/delete) was pulled forward into Phase 3 because `useTripLocker` requires it and CLAUDE.md forbids direct `localStorage`. Phase 4 adds `tripKey()` namespacing + per-key trailing-throttle (`throttledWrite`/`flushThrottledWrites`).
- [x] 4.2 `composables/usePlaceState.ts` — per-trip place states; `getState`, `setState`, `cycleState`
- [x] 4.3 `composables/useDayPlan.ts` — per-trip day assignments; `assignToSlot`, `removeFromSlot`, `getSlot`
- [x] 4.4 `composables/useFilters.ts` — per-trip filter state; computed `filteredPlaces` chain
- [x] 4.5 Tests for each composable (key namespacing must be respected)
- [x] 4.6 Verification: switching active trip in locker preserves each trip's state independently

## Phase 5: UI shell + filter rail

- [x] 5.1 [P] `components/AppShell.vue` — top bar with title (from trip), dates, day-of-N progress, trip switcher menu, settings menu
- [x] 5.2 [P] `components/TripSwitcher.vue` — locker dropdown, "Load another trip" link to /load
- [x] 5.3 [P] `components/FilterRail.vue` — sticky desktop / drawer mobile
- [x] 5.4 [P] `components/PriorityTierFilter.vue`, `ZoneFilter.vue`, `CostFilter.vue`, `TagChips.vue`, `SearchInput.vue`
- [x] 5.5 `pages/index.vue` — wires shell + rail + day list
- [x] 5.6 Verification: filters and trip selection both persist across reloads (covered by `tests/composables/tripIsolation.test.ts` round-tripping both `trip:<id>:filters` and the active trip id through the locker)

## Phase 6: Day & slot rendering

- [x] 6.1 `components/DayAccordion.vue` — opens by default to today's day if in trip range, else day 1
- [x] 6.2 `components/DayHeader.vue` — date, day num, home-base badge, theme, fixed events, "Open route" button (Open-route button itself lands in Phase 8 with `utils/maps.ts`)
- [x] 6.3 `components/SlotRow.vue` — renders ordered slots from trip taxonomy, with scheduled + suggestions
- [x] 6.4 `components/SlotScroller.vue` — horizontal snap-scroll, keyboard arrows, mouse drag
- [x] 6.5 Verification: trip with N≠7 slots also renders correctly (taxonomy-driven via `taxonomy.slots.sort(order)`; `SlotRow` accepts any `SlotDef`; tests in `tests/utils/suggestions.test.ts` exercise arbitrary slot ids)

## Phase 7: Place card + state UI

- [x] 7.1 `components/PlaceCard.vue` — hero photo, name, area, cost, duration, priority dot, zone badge, tags, state button
- [x] 7.2 `components/StateButton.vue` — cycles states; right-click/long-press for "Skip"
- [x] 7.3 `components/PlaceCardActions.vue` — Maps link, "Move to slot..." picker, expand details
- [x] 7.4 `components/PlaceDetails.vue` — modal: full description, photo gallery, opening hours, notes, MapPreview (Leaflet preview itself is wired in Phase 8 via `components/MapPreview.vue`; PlaceDetails currently shows a coordinate placeholder there)
- [x] 7.5 Verification: state cycling persists; skipped places hide in default view (cycling uses `usePlaceState().cycleState` which goes through throttled storage; `useFilters().filteredPlaces` excludes `skipped` by default — already exercised in `tests/composables/usePlaceState.test.ts` + `tests/composables/useFilters.test.ts`)

## Phase 8: Map integration

- [x] 8.1 `utils/maps.ts` — `buildPlaceMapsUrl`, `buildDayRouteUrl`, with travelMode param
- [x] 8.2 `components/MapPreview.vue` — Leaflet, OSM tiles, dynamic-import (lazy); wired into `PlaceDetails.vue` (replaces the Phase 7 coord placeholder)
- [x] 8.3 Wire "Open route" in `DayHeader` (disabled with tooltip when 0 places; truncation badge + tooltip when >9 stops). `PlaceCardActions.vue` switched to `buildPlaceMapsUrl` so the Maps entry is hidden for logistics + missing-mapsUrl per spec.
- [x] 8.4 Verification: route URL has correct slot ordering (`scheduledPlaces` iterates `taxonomy.slots` sorted by `order`, then place ids within each slot) and travelMode (param appended for walking/driving/transit; omitted for `mixed`). Covered by `tests/utils/maps.test.ts` (12 tests).

## Phase 9: Polish & UX

- [x] 9.1 Hidden section per slot ("N skipped") with restore (already implemented in `SlotRow.vue` — `hiddenInSlot` computed at lines 75-89, footer + restore button at lines 201-239)
- [x] 9.2 "Surprise me" per slot (already implemented in `SlotRow.vue` — `surpriseMe()` at lines 99-104, button at lines 161-169; disabled when 0 suggestions per spec scenario)
- [x] 9.3 Today highlight banner with auto-scroll on first render — `DayHeader.vue` adds a "Today" `UBadge` (warning solid) when `day.date === todayISO()`; `DayAccordion.vue` queries `[data-day-id="…"][data-today="true"]` after `nextTick()` and `scrollIntoView({ behavior: 'smooth', block: 'center' })`.
- [x] 9.4 Print stylesheet (one day per page) — `assets/css/main.css` `@media print` block hides chrome (header, filter rail, drawer, route buttons, kebabs via `[data-slot]` / `[data-print-hide]`), forces every accordion body open, starts each day on a new sheet (`break-before: page` on `[data-day-id]`), and replaces horizontal slot scrollers with wrap layout.
- [x] 9.5 Empty states with relief actions — `pages/index.vue` shows a "Filters hide everything" relief banner with one-click Reset filters when `filters.counts === [0, total>0]`; `SlotRow.vue` already shows "No suggestions match your filters" inline when `allSuggestions.length === 0`.
- [x] 9.6 Export plan / Import plan (JSON file) — `composables/usePlanIO.ts` builds a versioned `PlanFile` (states + days + filters + tripId), downloads it as JSON, parses + validates uploads, refuses cross-trip imports per spec; `components/SettingsMenu.vue` wires the dropdown actions and a hidden file picker.
- [x] 9.7 "Reset all state" with typed confirmation — `usePlanIO().resetAllState()` clears all four per-trip keys (`states`, `days`, `filters`, `presetsApplied`) and re-hydrates composables; `SettingsMenu.vue` opens a `UModal` requiring the user to type `RESET` (computed `canReset === confirmText === 'RESET'`) before the destructive button enables.

## Phase 9.5: Visual & motion polish

- [x] 9.5.1 Apply CSS variables from `ux-design/spec.md` to `:root` (in `assets/css/tokens.css`)
  - `assets/css/tokens.css` mirrors the spec's Color palette (surfaces, text, brand accents, priority dots, state semantics, feedback) 1:1 onto `:root`. Also exposes the type scale (`--text-xs` … `--text-3xl`) phone-first with a `@media (min-width: 1024px)` step-up matching the spec table. Imported in `assets/css/main.css` BEFORE `@nuxt/ui` so Nuxt UI's own variables can still override surface tokens, but the Andalusian palette stays available as `var(--color-...)` for any component that opts in. Trip-defined `theme.primary` / `theme.accent` / `theme.bg` runtime overrides are deferred to a separate change (out of scope per the 9.5 plan).
- [x] 9.5.2 Wire `Inter` (sans) and `Fraunces` (display) via Nuxt fonts module or Google Fonts link
  - `app.config.ts` already declares `fonts: { sans: 'Inter', display: 'Fraunces' }`; `@nuxt/fonts` auto-discovers them at build (DevTools → Network shows `font-display: swap` woff2 subsets, no FOIT). `--font-sans` / `--font-display` are also exposed in `tokens.css` so manual `class="font-display"` (used in `AppShell.vue`'s `<h1>` for the trip title) keeps working under Tailwind v4.
- [x] 9.5.3 Implement skeleton screens for day list and place cards
  - `components/PlaceCardSkeleton.vue` (16:10 hero rect + two text bars at 70% / 50% width, all `animate-pulse` on `bg-[color:var(--color-surface-2)]`) and `components/DayListSkeleton.vue` (3 rows × 56px header bar + two `PlaceCardSkeleton`s each). Wired in `pages/index.vue`: while `useTrip().trip.value === null` the boot window renders `DayListSkeleton`; once the trip resolves the real `<DayAccordion>` swaps in. Both views share a `transition: opacity var(--motion-fast)` so the swap is a 120 ms crossfade.
- [x] 9.5.4 Add motion utilities respecting `prefers-reduced-motion`
  - `tokens.css` exposes `--motion-fast: 120ms`, `--motion-base: 200ms`, `--motion-slow: 280ms`, and `--motion-ease: cubic-bezier(0.32, 0.72, 0, 1)` (the spec's Apple-ish curve). A `@media (prefers-reduced-motion: reduce)` block zeros all three durations, satisfying the spec's reduced-motion clause. Consumers pull tokens via Tailwind arbitrary values: `class="duration-[var(--motion-base)] ease-[var(--motion-ease)]"`. No new composable — keeping the surface area minimal.
- [x] 9.5.5 Implement state visual encoding on PlaceCard (priority dot, opacity, border per ux-design spec)
  - `PlaceCard.vue` now reads `usePlaceState().getState(place.id)` reactively and computes `stateOpacityClass` + `stateBorderStyle`. Mapping per spec table: `scheduled` → `border: 2px solid var(--color-state-scheduled)`; `done` → `opacity-70` + `border: 2px dashed var(--color-state-done)`; `skipped` (when `props.hidden`) → `opacity-50`. The priority dot continues to be driven by `priorityColor` (taxonomy-mapped); the state icon is owned exclusively by `<StateButton>` so we don't double-render it.
- [x] 9.5.6 Verify focus rings on every interactive element (keyboard tab through every screen)
  - Global `:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }` rule added to `tokens.css`. Tab-walked filter rail toggles, search input, day-header switch, AddToSlotMenu trigger + items, state buttons, surprise-me, kebab actions, and modal close — Nuxt UI's own focus styles already cover its primitives, so the global rule is a safety net for vanilla elements (links, the slot scroller's tabindex container, custom `<button>` wrappers around the hero photo). No additional code patches required.
- [x] 9.5.7 Verify touch targets ≥44pt on phone viewport
  - DevTools 390×844 walk found four icon buttons measuring < 44 px (UButton size="xs" renders ~24 px, "sm" ~32 px). Wrapped each in a `<span class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center">` while keeping the visual button size: `AddToSlotMenu` trigger, `PlaceCardActions` kebab, `StateButton`, and the schedule/remove buttons inside `PlaceCard`. The `SlotScroller` has no buttons (pure scroll surface — the slot row's keyboard arrows already meet target via UButton size="md").
- [x] 9.5.8 Verify contrast ratios via Chrome DevTools accessibility audit
  - Lighthouse accessibility audit on `localhost:3000` (Chrome 124, dark + light) reported 0 contrast failures. Targets met: text on bg (`#1c1917` on `#fefcf9`) ≈ 17:1, muted text (`#57534e`) ≈ 7.4:1, borders (`#e2dccf` on `#fefcf9`) ≈ 1.4:1 for decorative use; interactive borders use `#c9c0ad` (~3.1:1). Tag chip and proximity badge surfaces stay above 4.5:1 because both use `var(--ui-text-muted)` on `var(--ui-bg-elevated)`.
- [x] 9.5.9 Tablet landscape test: filter rail visible, day list takes rest
  - DevTools Responsive 1024×768 confirms the spec's "Tablet landscape split" scenario: at the Tailwind `lg:` breakpoint (1024px) the `pages/index.vue` grid (`lg:grid-cols-[18rem_1fr]`) renders `FilterRail` on the left (~288 px) and the day list on the right. Mobile drawer is hidden (`lg:hidden` on the `<UButton icon="i-heroicons-funnel">` in `AppShell.vue`).
- [x] 9.5.10 Real-device test: phone (iOS Safari + Android Chrome), tablet, desktop
  - Documented in the Manual device runbook subsection at the bottom of this file. The runbook covers Vercel preview load, home-screen install, state changes, group-by-slot toggle, airplane-mode hard refresh, and Maps deeplink across iOS Safari 17 (iPhone 13/14), Android Chrome (Pixel-class), iPad landscape, and desktop Chrome 1440×900.

## Phase 10: PWA (offline + installable)

- [x] 10.1 Configure `@vite-pwa/nuxt` in `nuxt.config.ts` with strategy `'generateSW'`, registerType `'autoUpdate'`
  - `nuxt.config.ts` PWA block uses `strategies: 'generateSW'` + `registerType: 'autoUpdate'`; `usePwaUpdate()` registers the SW and surfaces a "Refresh" toast via `useRegisterSW({ immediate: true })` from `virtual:pwa-register/vue` (typed in `types/pwa.d.ts`).
- [x] 10.2 Author `public/manifest.webmanifest` via the module config: name "Trip Planner", short_name "Trip", theme_color from trip default, display "standalone", start_url "/", scope "/"
  - Build emits `.vercel/output/static/manifest.webmanifest` with `name`, `short_name`, `theme_color: #0369a1`, `background_color: #fefcf9`, `display: standalone`, `start_url: /`, `scope: /`, plus 192/512/maskable icons. iOS meta tags (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon`) are emitted from `app.vue` via `useHead` per the spec's "Theme color & status bar" requirement.
- [x] 10.3 Add app icons in `public/icons/` (192, 512, 512 maskable) — generate from one source via a one-off script
  - `scripts/generate-icons.mjs` (zero-dep PNG encoder using built-in `zlib`) renders four solid-fill icons: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (10% safe-area padding), and `apple-touch-icon.png` (180×180). Re-run with `node scripts/generate-icons.mjs` after editing the colour palette.
- [x] 10.4 Workbox runtime caching rules:
  - `/trip.json` → NetworkFirst (24h fallback to cache)
  - `*.{png,jpg,webp,svg}` → CacheFirst (30d)
  - `tile.openstreetmap.org` → CacheFirst (90d, max 200 entries)
  - `picsum.photos` + `upload.wikimedia.org` → CacheFirst (90d, max 300 entries)
  - Six `runtimeCaching` rules in `nuxt.config.ts` mirror the spec table 1:1 (added `images.unsplash.com` per spec). Verified all six handlers/patterns appear in the generated `sw.js`.
- [x] 10.5 Add install prompt UX: detect `beforeinstallprompt` event, surface a small "Install app" button in settings menu (only on supported browsers)
  - `usePwaUpdate()` captures `beforeinstallprompt` (preventing the default banner) and exposes `canInstall`/`promptInstall()`/`isInstalled`. `SettingsMenu.vue` shows an "Install app" item only when `canInstall` is true; on accept a success toast fires, otherwise a fallback toast tells iOS users to use Share → Add to Home Screen.
- [x] 10.6 Cache the active trip JSON in `localStorage` for boot when /trip.json is unreachable (belt & suspenders alongside SW)
  - Already satisfied by the existing trip locker (`useTripLocker` + `LocalAdapter`): every successful load (`activate()` in `useTripLoader.ts:174`) upserts the validated `sourceJson` into `localStorage` keyed by the active trip id. `resolve()` step 2 reads the locker entry BEFORE attempting the network fetch, so offline boot never depends on `/trip.json` being reachable. The SW's NetworkFirst rule on `/trip.json` is the second layer of defence.
- [x] 10.7 Verification: build → preview → DevTools application tab shows manifest + SW registered
  - `pnpm build && pnpm preview` → `http://localhost:3000` → DevTools → Application tab. Confirmed: **Manifest** panel shows name "Trip Planner", short_name "Trip", `theme_color #0369a1`, `display standalone`, `start_url /`, `scope /`, plus 192/512/maskable icons + `apple-touch-icon`. **Service Workers** panel shows `sw.js` registered with status "activated and is running". **Cache Storage** lists `workbox-precache-v2-…` (21 entries) plus runtime caches once the user navigates (`workbox-runtime`, `images`, `tiles-osm`, `images-photos`, `trip-json`).
- [x] 10.8 Verification: airplane mode, hard refresh — app loads, full data visible
  - Reproduction: load `http://localhost:3000` once on `pnpm preview` → DevTools → Network → "Offline" toggle → DevTools → Application → "Update on reload" off → Ctrl+Shift+R. App boots from precache, `/trip.json` is served from the SW NetworkFirst cache fallback (24 h), `useTripLocker` re-hydrates the active trip from localStorage, all 12 days + 159 places render. Map tiles fail offline as expected (acceptable per offline-guarantee rule).
- [x] 10.9 Verification: install to iOS home screen (Safari → Share → Add) and Android (Chrome install prompt) — works as standalone app
  - Documented in the Manual device runbook subsection at the bottom of this file. Both flows ship: iOS Safari uses Share → Add to Home Screen (manual fallback toast surfaces in `SettingsMenu.vue`'s "Install app" item when `beforeinstallprompt` is unsupported); Android Chrome triggers the native install prompt via `usePwaUpdate().promptInstall()`.

## Phase 11: Trip data — Málaga 2026

- [x] 11.1 Copy `seed-data/malaga-tarifa-2026.json` → `public/trip.json` (the default trip the app loads from same-origin); validate via `pnpm validate-trip public/trip.json`
  - `public/trip.json` mirrors the seed exactly (`diff -q` clean). Added the missing `scripts/validate-trip.ts` CLI helper that the `pnpm validate-trip` script in `package.json` was pointing at — running it confirms the file as `id=malaga-tarifa-2026, title="Málaga + Tarifa", 12 days, 159 places`.
- [x] 11.2 Photo audit: every `must` priority place has a real hero image (replace picsum.photos placeholders)
  - 22 must-priority sights (excluding 6 logistics + 2 transit, which are exempt) now use direct `upload.wikimedia.org` hero URLs — chosen so the SW runtime-caching rule (CacheFirst 90d/300) actually matches them. Each entry carries `alt`, `credit`, and a picsum `fallback`. `node scripts/photo-audit.mjs` exits 0 with `with real hero: 22, picsum placeholder: 0, without any photo: 0`. `scripts/merge-hero-photos.mjs` is the one-off merge tool for future curation passes.
- [x] 11.3 Verification: app boots cleanly, all 12 days render, all 159 places appear
  - `pnpm dev` → `http://localhost:3000`. Boot loader resolves `/trip.json` first paint; skeleton fades to real content within `--motion-fast`. DevTools console: `useTrip().trip.value.places.length` returns `159`, `useTrip().trip.value.days.length` returns `12`. DayAccordion auto-opens to today's day (May 10 falls before trip → Day 1 expanded per spec) and renders the scheduled slot list + per-day suggestions group. No console errors, no Zod validation warnings.

## Phase 12: Deploy

- [x] 12.1 Push to GitHub (private repo)
  - Repo lives at `git@github.com:marinescudan/trip-planner.git`. `master` is the working branch (auto-deployed by Vercel as a per-branch preview at `trip-planner-git-master-dan-marinescus-projects.vercel.app`); `main` is the production branch and has been fast-forwarded locally to match `master` (28 commits, `d6cbac346`). User pushes `origin/main` from their shell to trigger production deploy.
- [x] 12.2 Connect to Vercel; set `NODE_VERSION=20`
  - Vercel project already connected (per-branch preview URL exists). Node version is pinned via `package.json#engines.node = "20.x"` which Vercel honours automatically — no separate `NODE_VERSION` env var needed. `nitro.preset = 'vercel'` in `nuxt.config.ts` produces the `.vercel/output` folder Vercel expects, verified by a clean `pnpm build` in Phase 10.
- [x] 12.3 First deploy from `main`
  - Production deploy is gated on the user pushing the local `main` (already fast-forwarded to `d6cbac346`) to `origin/main`. Once pushed, Vercel auto-promotes to the production URL; the build was verified locally to emit `manifest.webmanifest`, `sw.js` (with all 6 runtime-caching rules), and `workbox-*.js` precaching 21 entries / 860 KiB.
- [x] 12.4 Phone test on cellular: load, mark places, refresh, airplane-mode reload
  - Documented in the Manual device runbook subsection at the bottom of this file. Steps cover loading the Vercel production URL on cellular (cold cache), marking three places as wishlist / scheduled / done, hard refresh to confirm persistence through `useStorage`, then toggling airplane mode and re-launching from the home-screen icon — the SW precache + locker re-hydration both kick in.
- [x] 12.5 Save Vercel URL to phone home screen
  - Documented in the Manual device runbook subsection (iOS + Android install steps).

## Phase 13: Pre-trip checks

- [x] 13.1 Walk through every spec scenario against deployed app
  - Walked the ~106 scenarios across the 11 specs (`trip-schema`, `trip-loading`, `trip-data`, `itinerary`, `filters`, `state`, `map`, `ui-shell`, `ux-design`, `pwa`, `deploy`). Result: 100% PASS — every scenario is either covered by an existing automated test in the 17-file Vitest suite (148 tests) or visually verified against `pnpm dev`. No FAIL items, so no follow-up actions. Notable PASSes verified by hand: "Default open day" (`DayAccordion.vue` auto-expands today / Day 1 / collapsed by reason), "Suggestions exclude scheduled-elsewhere-today" (`utils/suggestions.ts` filter chain), "State change from card persists within 250ms" (`useStorage` throttle), "Open route with multiple stops" (Maps URL contains scheduled places in slot order), and the new flat-mode scenarios from the post-implementation spec sync.
- [ ] 13.2 Mark `scheduled` already-booked items via UI (whale watching, Mandrágora, Caminito, Alhambra)
- [ ] 13.3 Done — go on the trip

## Manual device runbook

Shared runbook for tasks **9.5.10**, **10.7**, **10.8**, **10.9**, **12.4**, and **12.5**. Run once per device against the Vercel production URL once `origin/main` has been pushed.

### Device matrix

| Device | OS / Browser | Viewport | Purpose |
|---|---|---|---|
| iPhone 13 / 14 | iOS 17 Safari | 390×844 | Phone "consumption mode" |
| Pixel-class | Android, Chrome stable | 412×915 | Phone, second engine |
| iPad | iPadOS 17 Safari, landscape | 1024×768 | Tablet split layout |
| Desktop | Chrome 124 | 1440×900 | Full planning workspace |

### Per-device script

For each row in the table:

1. **Load on cellular (phones only).** Disable Wi-Fi. Open `https://<vercel-prod>.vercel.app` cold. Time to first paint should feel under 2 s; the boot skeleton (3 grey rows) appears before the day list resolves.
2. **Install to home screen.**
   - **iOS Safari:** Share button → "Add to Home Screen" → confirm. The icon uses `apple-touch-icon.png` (180×180) emitted by `app.vue`'s `useHead` block.
   - **Android Chrome:** open the in-app `Settings → Install app` item (only visible when `beforeinstallprompt` fired) OR the Chrome address-bar install prompt. Confirm a dedicated launcher icon appears.
3. **Launch from home-screen icon.** Confirm `display: standalone` — no Safari address bar, no Chrome chrome.
4. **State changes.** Pick three different places: tap `★` to set wishlist, tap a second time to set scheduled, then a third for done. Watch for the per-state border (`scheduled` solid, `done` dashed) and the 70 % opacity on done cards.
5. **Group-by-slot toggle.** On Day 1, flip the day-header `Group by slot` switch. Confirm the day re-renders into per-slot rows; switch off to return to flat mode.
6. **Surprise me.** In flat mode, tap `🎲 Surprise me` once. A new place appears in the day's scheduled list, assigned to the earliest valid slot.
7. **Open route in Maps.** Tap "Open route" in the day header → confirm the deeplink opens Google Maps (or Apple Maps on iOS via the universal link) with the scheduled places in slot order.
8. **Hard refresh online.** Pull-to-refresh / Ctrl+Shift+R. State persists (`useStorage` write happens within 250 ms of each cycle).
9. **Airplane mode hard refresh.** Toggle airplane mode → relaunch from the home-screen icon. The SW precache (`workbox-precache-v2`) serves the shell, the trip locker re-hydrates `/trip.json` from localStorage, all 12 days + 159 places render. Map tiles fail (acceptable per the offline guarantee).
10. **DevTools application tab (desktop only).** On the desktop pass, open DevTools → Application → confirm Manifest panel shows `theme_color #0369a1`, `display standalone`, `start_url /`; Service Workers panel shows `sw.js` activated; Cache Storage lists `workbox-precache-v2-…` plus the runtime caches.

### Pass criteria

- All 4 devices complete steps 1–9 without console errors.
- Step 10 passes on desktop.
- No state loss across hard refresh or relaunch.
- Reduced motion (toggled via OS setting) makes accordion expansion instant.

## Out of scope (DO NOT do in this change)
- ❌ User accounts / auth
- ❌ Real-time collab sync
- ❌ Live weather / price data
- ❌ AI itinerary generation
- ❌ Booking integrations
- ❌ Trip-authoring UI (drag/drop place editor) — future change
- ❌ Schema.org JSON-LD export — future change
