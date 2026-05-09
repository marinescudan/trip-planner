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

- [ ] 9.5.1 Apply CSS variables from `ux-design/spec.md` to `:root` (in `assets/css/tokens.css`)
- [ ] 9.5.2 Wire `Inter` (sans) and `Fraunces` (display) via Nuxt fonts module or Google Fonts link
- [ ] 9.5.3 Implement skeleton screens for day list and place cards
- [ ] 9.5.4 Add motion utilities respecting `prefers-reduced-motion`
- [ ] 9.5.5 Implement state visual encoding on PlaceCard (priority dot, opacity, border per ux-design spec)
- [ ] 9.5.6 Verify focus rings on every interactive element (keyboard tab through every screen)
- [ ] 9.5.7 Verify touch targets ≥44pt on phone viewport
- [ ] 9.5.8 Verify contrast ratios via Chrome DevTools accessibility audit
- [ ] 9.5.9 Tablet landscape test: filter rail visible, day list takes rest
- [ ] 9.5.10 Real-device test: phone (iOS Safari + Android Chrome), tablet, desktop

## Phase 10: PWA (offline + installable)

- [ ] 10.1 Configure `@vite-pwa/nuxt` in `nuxt.config.ts` with strategy `'generateSW'`, registerType `'autoUpdate'`
- [ ] 10.2 Author `public/manifest.webmanifest` via the module config: name "Trip Planner", short_name "Trip", theme_color from trip default, display "standalone", start_url "/", scope "/"
- [ ] 10.3 Add app icons in `public/icons/` (192, 512, 512 maskable) — generate from one source via a one-off script
- [ ] 10.4 Workbox runtime caching rules:
  - `/trip.json` → NetworkFirst (24h fallback to cache)
  - `*.{png,jpg,webp,svg}` → CacheFirst (30d)
  - `tile.openstreetmap.org` → CacheFirst (90d, max 200 entries)
  - `picsum.photos` + `upload.wikimedia.org` → CacheFirst (90d, max 300 entries)
- [ ] 10.5 Add install prompt UX: detect `beforeinstallprompt` event, surface a small "Install app" button in settings menu (only on supported browsers)
- [ ] 10.6 Cache the active trip JSON in `localStorage` for boot when /trip.json is unreachable (belt & suspenders alongside SW)
- [ ] 10.7 Verification: build → preview → DevTools application tab shows manifest + SW registered
- [ ] 10.8 Verification: airplane mode, hard refresh — app loads, full data visible
- [ ] 10.9 Verification: install to iOS home screen (Safari → Share → Add) and Android (Chrome install prompt) — works as standalone app

## Phase 11: Trip data — Málaga 2026

- [ ] 11.1 Copy `seed-data/malaga-tarifa-2026.json` → `public/trip.json` (the default trip the app loads from same-origin); validate via `pnpm validate-trip public/trip.json`
- [ ] 11.2 Photo audit: every `must` priority place has a real hero image (replace picsum.photos placeholders)
- [ ] 11.3 Verification: app boots cleanly, all 12 days render, all 159 places appear

## Phase 12: Deploy

- [ ] 12.1 Push to GitHub (private repo)
- [ ] 12.2 Connect to Vercel; set `NODE_VERSION=20`
- [ ] 12.3 First deploy from `main`
- [ ] 12.4 Phone test on cellular: load, mark places, refresh, airplane-mode reload
- [ ] 12.5 Save Vercel URL to phone home screen

## Phase 13: Pre-trip checks

- [ ] 13.1 Walk through every spec scenario against deployed app
- [ ] 13.2 Mark `scheduled` already-booked items via UI (whale watching, Mandrágora, Caminito, Alhambra)
- [ ] 13.3 Done — go on the trip

## Out of scope (DO NOT do in this change)
- ❌ User accounts / auth
- ❌ Real-time collab sync
- ❌ Live weather / price data
- ❌ AI itinerary generation
- ❌ Booking integrations
- ❌ Trip-authoring UI (drag/drop place editor) — future change
- ❌ Schema.org JSON-LD export — future change
