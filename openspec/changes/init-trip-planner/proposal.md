# Proposal: Initialize Trip App + Málaga–Tarifa Trip JSON

## Why
We need a tool to plan an 11-day trip with ~145 curated places, multiple home bases, day-locked items (weekly markets, ferry days), a birthday focal point, and a budget. The tool must work offline on a phone and survive the trip without bugs.

But this is the first of many trips. Building it as a one-off Málaga app means rewriting it for every future trip. Building it as a **trip renderer that consumes a trip JSON file** means the next trip = a new JSON, no code.

This change ships:
1. The trip-renderer app (Nuxt 3, deployed to Vercel)
2. A formal Trip JSON v1.0 schema
3. The first trip JSON: `malaga-tarifa-2026.json`

## What Changes
Greenfield. Everything is ADDED.

### App
- A Nuxt 3 + Tailwind app deployed to Vercel
- Loads a trip JSON (default URL `/trip.json`, override via `?trip=<url>` or paste/drag-drop)
- Renders the trip's day-by-day itinerary with N time slots per day (slots defined by trip)
- Multi-state place tracking (untouched / wishlist / scheduled / done / skipped)
- Filter rail driven entirely by the trip JSON's taxonomy (priority, zone, cost, tags)
- Per-place and per-day Google Maps links; inline Leaflet preview
- Persists state in localStorage, scoped per trip ID
- Trip locker (multiple trips selectable from a switcher)
- Export/import plan as JSON (manual sync between devices)
- Offline-ready: app shell + last-loaded trip cached after first visit

### Schema
- A Trip JSON v1.0 specification (this change's `specs/trip-schema/spec.md`)
- A Zod validator that parses any trip JSON; build fails on invalid trip data
- A documented mapping to schema.org for future export

### Data
- One complete trip JSON for Málaga + Tarifa (2026-05-12 → 2026-05-23)
- ~145 places spanning Málaga, Tarifa, day trips, logistics
- 12 days with themes, home base assignments, travel modes
- Presets for already-booked items (whale watching scheduled May 18)

## Impact
- **New code only** — no migrations
- **Affected users:** Dan + Raluca (current trip), and anyone Dan shares the URL with for future trips
- **Affected systems:** none (no backend)
- **Deploy target:** Vercel free tier
- **Privacy:** localStorage only — no PII leaves the browser
- **Cost:** €0 (Vercel + free tools)
- **Hard deadline:** must be deployable before May 12, 2026
- **Future iteration:** the renderer is reusable — every future trip is a new JSON, not a new app
