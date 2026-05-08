# Design: Trip App

## Architecture overview

```
┌──────────────────────────────────────────────────────────────┐
│                  Browser (single tab)                          │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                 Nuxt 3 app shell                         │  │
│  │                                                          │  │
│  │  Pages:                                                  │  │
│  │    /              load default trip, render              │  │
│  │    /load          trip-loader UI (URL/drop/paste)        │  │
│  │                                                          │  │
│  │  Composables:                                            │  │
│  │    useTrip()        ─ active trip object + helpers        │  │
│  │    useTripLoader()  ─ resolve, fetch, validate JSON      │  │
│  │    useTripLocker()  ─ list/save/select multiple trips    │  │
│  │    useFilters()     ─ filter state, derived list         │  │
│  │    usePlaceState()  ─ multi-state per place per trip     │  │
│  │    useDayPlan()     ─ slot assignments per trip          │  │
│  │    useStorage()     ─ typed localStorage wrapper         │  │
│  │                                                          │  │
│  │  Components: AppShell, FilterRail, DayAccordion,         │  │
│  │              SlotRow, SlotScroller, PlaceCard, ...       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  localStorage (keys per active trip):                          │
│    trip:locker            → list of saved trips                │
│    trip:active            → currently active trip ID           │
│    trip:<tripId>:states   → place state map                    │
│    trip:<tripId>:days     → day assignments                    │
│    trip:<tripId>:filters  → filter UI state                    │
│    trip:<tripId>:cache    → last-fetched JSON snapshot         │
└──────────────────────────────────────────────────────────────┘
```

## Trip resolution flow (most important)

```
App boots
    │
    ▼
Look up `?trip=<url>` query param
    │
    ├─ Present? → fetch URL, validate, save to locker, set active
    │
    └─ Absent? → check `trip:active` in localStorage
                    │
                    ├─ Present? → load that trip from locker
                    │
                    └─ Absent? → fetch /trip.json (default ship)
                                    │
                                    └─ failed? → show /load page
```

`/load` page accepts: URL, file drop, JSON paste. All routes go through Zod validation; invalid trips show diagnostics, do not load.

## Why this architecture
- **Trip is data, not code.** The renderer doesn't know "Málaga"; it knows "Trip<v1>".
- **One repo ships one default trip,** but the user can load any compliant JSON.
- **Per-trip state isolation** via `trip:<tripId>:` prefix — switching trips doesn't lose state of either.
- **No backend** — same as before. All data static, all state local.
- **Composables, no Pinia** — scope still small.

## Trip JSON v1.0 — top-level shape

```jsonc
{
  "$schema": "trip-app/v1.0.0",
  "trip":     { /* metadata: id, title, dates, travelers, theme */ },
  "homeBases":[ /* one or more places-the-user-sleeps */ ],
  "taxonomy": { /* slots, priorityTiers, costTiers, zones, energy */ },
  "places":   [ /* the catalog */ ],
  "days":     [ /* the itinerary skeleton, no place assignments */ ],
  "presets":  { /* optional pre-set states + scheduled items */ }
}
```

The full schema is in `specs/trip-schema/spec.md`. Authoring rules in `specs/trip-data/spec.md`. Loading mechanics in `specs/trip-loading/spec.md`.

## Schema.org mapping (informative, not required)

| Trip JSON field | Schema.org equivalent |
|---|---|
| `trip` | `TouristTrip` |
| `places[].type=monument` | `TouristAttraction` / `LandmarksOrHistoricalBuildings` |
| `places[].type=museum` | `Museum` |
| `places[].type=food` | `Restaurant` |
| `places[].type=cafe` | `CafeOrCoffeeShop` |
| `places[].type=beach` | `BeachResort` (closest) / generic `Place` |
| `places[].coords` | `geo.latitude` + `geo.longitude` |
| `days` | `Itinerary` (custom subtype) |

A future export change can produce JSON-LD with `@context: "https://schema.org"`; we don't ship that in v1.

## State machines

**Place state** (unchanged from earlier):
```
untouched → wishlist | scheduled | skipped
wishlist  → scheduled | skipped | untouched
scheduled → done | skipped | wishlist
done      → untouched | skipped
skipped   → untouched
```

**Trip state** (new):
```
no-trip → loading → loaded → ready
                    ↓
                 invalid (show diagnostics, stay on /load)
```

## Filter pipeline

```
trip.places (e.g. ~145)
  ├─ filter by trip-active priority tier toggles
  ├─ filter by zone toggles
  ├─ filter by cost tier toggles
  ├─ filter by tag chips (OR or AND)
  ├─ exclude state ∈ {skipped} unless "show hidden"
  ├─ for slot view: validSlots includes <slot>
  ├─ for day view: validDays empty OR includes <date>
  └─ free-text search (name + area + tags)
       ▼
    visible places
```

## Day-slot rendering algorithm

For each day:
1. Resolve theme & travel mode from `days[]` entry
2. For each slot (in trip's defined slot order):
   a. Show user-scheduled places first
   b. Below: top-N suggestions by trip's priority weight, where validSlots includes slot, validDays allows this date, state ≠ skipped, place not scheduled in another slot of this day
   c. "Show all (n)" expander
3. "Open route" button composes Google Maps URL from scheduled places ordered by slot

## Persistence (adapter pattern — important for future cloud sync)

```ts
interface StorageAdapter {
  get<T>(key: string, schema: ZodSchema<T>): Promise<T | null>
  set<T>(key: string, value: T, schema: ZodSchema<T>): Promise<void>
  delete(key: string): Promise<void>
  list(prefix: string): Promise<string[]>
  /** for cloud adapters: subscribe to remote changes */
  subscribe?(key: string, cb: (value: unknown) => void): () => void
}

class LocalAdapter implements StorageAdapter { /* localStorage */ }
class CloudAdapter implements StorageAdapter { /* future — Vercel KV via /api */ }
```

`useStorage<T>(key, schema, defaultValue)` is a thin reactive wrapper around the active adapter. The adapter is selected by:
1. `trip.sync` field present in trip JSON → `CloudAdapter`
2. Otherwise → `LocalAdapter`

v1 ships only `LocalAdapter`. The `CloudAdapter` arrives in change `add-cloud-sync`.

Keys are namespaced by active trip ID. Switching trips re-binds composables to the new namespace; current trip's writes never collide with a different trip's data.

**Why adapter, not direct localStorage**: lets us introduce cloud sync with one config change instead of rewriting every composable. The cost is one indirection in v1 — worth it.

## Trip locker

A small JSON in `localStorage[trip:locker]` of:
```ts
type LockerEntry = {
  id: string
  title: string
  source: 'default' | 'url' | 'upload'
  sourceUrl?: string
  loadedAt: ISODateTime
}
```

Locker UI in the top bar lets the user:
- Switch active trip
- Add a new trip (URL or file)
- Remove a trip from locker (does NOT delete its state — confirmed second action does)
- Re-fetch a URL trip to update content (state preserved)

## Why not... alternatives considered

| Option | Rejected because |
|---|---|
| Schema.org JSON-LD as primary format | Verbose, SEO-targeted, requires `@context`/`@type` everywhere — bad authoring UX |
| OpenTravel Alliance | B2B-scale, way too heavy |
| Bake the trip into the build | Defeats the point of reusability |
| One repo per trip | Maintenance nightmare; we want one app, many JSONs |
| Multi-tenant backend | Out of scope; one user can run their own copy |
| Universal "schema-less" renderer | Type-safety wins. Trip JSON v1 is small enough to spec rigorously |

## Versioning the trip schema

`$schema: "trip-app/v1.0.0"` is mandatory. The app supports its known major versions. Major-version bumps are a breaking change (new OpenSpec change with migration notes). Minor-version bumps are additive and the app warns if it sees a newer minor than it knows.

## Open questions
- Photos: ship in repo vs. lazy-load from URLs. Decision: trip JSON's `photos[].src` is opaque — could be relative path (shipped) or absolute URL (external). App treats both identically.
- Trip JSON size: ~150KB for Málaga trip. Acceptable. >1MB trips would push us toward chunking — out of scope.
- Editing trip JSON in-app: deferred to a future change.
