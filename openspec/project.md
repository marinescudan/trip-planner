# Project: Trip Planner App

## Purpose
A generic single-user trip-planner web app that **renders any trip from a JSON file** conforming to the Trip JSON schema (defined in `specs/trip-schema/`). The app shows curated places organized into a day-by-day itinerary with time slots, lets users track multi-state place intent (wishlist/scheduled/done/skipped), filters by trip-defined taxonomy (priority/zone/tags/cost), and persists state in localStorage scoped per trip.

The first shipped trip is **Málaga + Tarifa, May 12–23, 2026** for Dan + Raluca — but the app code is trip-agnostic. Future trips ship as new JSON files; no app changes required.

## Target users
- Dan (developer, primary user, also future trip JSON author)
- Raluca (joint planner for current Andalusia trip)
- Anyone Dan shares the URL with — they can load their own trip JSON via `?trip=<url>` or drop-in

## First shipped trip (data, not app behavior)
This data lives in `assets/data/malaga-tarifa-2026.json`, NOT in code:
- Arrival: Tue May 12, 2026 (Malaga)
- Malaga stay 1: May 12–17 (5 nights)
- Tarifa stay: May 17–20 (3 nights)
- Malaga stay 2: May 20–23 (3 nights)
- Departure: Sat May 23
- Birthday (Raluca): Mon May 18 (in Tarifa)
- Whale watching booked May 18 (preset to `scheduled`)
- Transport: rental car May 17–20 only
- Currency: EUR; languages: RO + EN
- ~145 places curated

The **app** does not hardcode any of these. It receives them via the trip JSON.

## Tech stack (locked)
- **Framework:** Nuxt 3 (Vue 3 + Composition API + `<script setup>`)
- **UI library:** Nuxt UI v3 (`@nuxt/ui`) — built on Tailwind v4 + Reka UI primitives. Mobile-first, accessible, themeable.
- **Styling:** Tailwind v4 (provided by Nuxt UI; no separate config)
- **Icons:** `@nuxt/icon` with Iconify (`heroicons` + `lucide` collections)
- **Fonts:** Inter (sans) + Fraunces (display) via `@nuxt/fonts`
- **State:** Composables + `useState` (no Pinia needed for this scope)
- **Persistence:** `StorageAdapter` interface; v1 ships `LocalAdapter` (localStorage) only
- **Data:** Static JSON shipped with the build (`/public/trip.json`)
- **Maps:** External link to `https://www.google.com/maps/...` URLs; embed Leaflet (free OSM tiles, no API key) for static map views
- **PWA:** `@vite-pwa/nuxt` — service worker via Workbox, offline shell + cached trip JSON, install prompt, web manifest
- **Validation:** Zod (runtime schema for trip JSON + storage)
- **Tests:** Vitest + happy-dom + @vue/test-utils
- **Deploy:** Vercel via `nitro.preset = 'vercel'`
- **Node:** 20.x
- **Package manager:** pnpm

Anything not in this list is OUT until a spec amendment is proposed and accepted.

## Non-goals (intentionally excluded in v1)
- No backend, no database, no auth (single user, single device)
- No multi-user real-time sync (localStorage only; manual export/import for transfer)
- No booking integration (plain links only)
- No live data (weather, prices, transit) — trip JSON is static
- No native mobile app — responsive web only
- No internationalization framework — trip JSON carries its own language
- No trip-authoring UI in v1 — author the JSON manually (a future change can add a builder)

## Conventions
- TypeScript everywhere; no `any` without comment
- Composable names: `useTrip`, `useFilters`, `usePlaceState`, etc.
- Component naming: `PascalCase.vue`, prefixed by domain (`PlaceCard`, `DayAccordion`, `SlotScroller`)
- Place IDs: kebab-case with city prefix (`mlg-alcazaba`, `trf-bolonia`, `dt-ronda`)
- All user-facing strings co-located with the component (no separate locale files)
- Test the data layer (composables) with Vitest; UI is browser-tested manually

## Source of truth ordering
1. `openspec/project.md` (this file) — global rules
2. `openspec/specs/` — current behavior (after archive)
3. `openspec/changes/<id>/` — proposed changes
4. Source code

If conflict: spec wins, code is updated to match.
