# Spec Delta: Trip Schema (Trip JSON v1.0)

## ADDED Requirements

### Requirement: Top-level shape
A trip JSON document SHALL be an object with exactly these top-level keys:

```jsonc
{
  "$schema":   "trip-app/v1.0.0",   // mandatory version string
  "trip":      { ... },              // metadata
  "homeBases": [ ... ],              // ≥1 sleep locations
  "taxonomy":  { ... },              // controlled vocabularies
  "places":    [ ... ],              // ≥1 places
  "days":      [ ... ],              // ≥1 days
  "presets":   { ... }               // OPTIONAL initial state
}
```

Any unknown top-level key SHALL be ignored (forward-compatible). Missing required keys SHALL fail validation.

#### Scenario: Missing $schema
- **GIVEN** a JSON missing `$schema`
- **WHEN** validated
- **THEN** validation fails with error "Missing $schema"

#### Scenario: Unknown top-level key
- **GIVEN** a JSON with an extra `"experimental": {...}` key
- **WHEN** validated
- **THEN** validation succeeds; the extra key is ignored at runtime

### Requirement: `trip` object
The `trip` object SHALL contain:

```ts
{
  id: string                    // kebab-case, unique per trip
  title: string
  subtitle?: string
  description?: string
  startDate: ISODate            // YYYY-MM-DD
  endDate: ISODate              // YYYY-MM-DD, ≥ startDate
  timezone: IANATimezone        // e.g. "Europe/Madrid"
  currency: ISO4217             // e.g. "EUR"
  language: BCP47               // e.g. "en", "ro"
  travelers: Traveler[]         // ≥1
  theme?: {
    primary?: HexColor
    accent?: HexColor
    bg?: HexColor
  }
}
```

`Traveler`:
```ts
{ id: string, name: string, birthdayDuringTrip?: ISODate }
```

#### Scenario: endDate before startDate
- **GIVEN** `startDate: "2026-05-23"` and `endDate: "2026-05-12"`
- **WHEN** validated
- **THEN** validation fails with error "endDate must be ≥ startDate"

#### Scenario: Birthday outside trip range
- **GIVEN** a traveler with `birthdayDuringTrip: "2026-12-25"` and trip range May 12–23
- **WHEN** validated
- **THEN** validation fails

### Requirement: `homeBases` array
Each home base represents a sleep location for a stretch of the trip:

```ts
{
  id: string
  label: string                 // user-facing
  city: string                  // for grouping, free-text
  address?: string
  coords: [lat: number, lng: number]
  dateRange: { from: ISODate, to: ISODate }
  notes?: string
}
```

The union of all home base date ranges SHOULD cover every trip day. Gaps are allowed (transit days) but flagged in app UI.

#### Scenario: Three home bases for Málaga–Tarifa–Málaga
- **GIVEN** home bases with date ranges 12–17, 17–20, 20–23
- **WHEN** validated
- **THEN** validation succeeds; UI groups days by their home base

### Requirement: `taxonomy` object
The taxonomy object defines the trip's controlled vocabularies:

```ts
{
  slots:          SlotDef[]          // ≥1
  priorityTiers:  PriorityTierDef[]  // ≥1
  costTiers:      CostTierDef[]      // ≥1
  zones:          ZoneDef[]          // ≥1
  energy:         EnergyDef[]        // ≥1
  weatherFlags?:  string[]           // OPTIONAL — referenced by places[].weather
}
```

`SlotDef`:
```ts
{ id: string, label: string, icon?: string, order: number, timeHint?: string }
```

`PriorityTierDef`:
```ts
{ id: string, label: string, color: HexColor, weight: number /* higher = higher priority */ }
```

`CostTierDef`:
```ts
{ id: string, label: string, symbol: string, max: number | null /* null = no upper bound */ }
```

`ZoneDef`:
```ts
{ id: string | number, label: string, hint?: string }
```

`EnergyDef`:
```ts
{ id: string, label: string, icon?: string }
```

#### Scenario: Trip with non-default slots
- **GIVEN** a trip with `slots: [{id:"breakfast",order:1},{id:"midday",order:2},{id:"sunset",order:3}]`
- **WHEN** the app renders
- **THEN** every day shows exactly three slot rows in that order
- **AND** `validSlots` on places references those slot ids

#### Scenario: Place references unknown slot
- **GIVEN** taxonomy slots `["morning","afternoon"]` and a place with `validSlots: ["dinner"]`
- **WHEN** validated
- **THEN** validation fails identifying the place id and the unknown slot

### Requirement: `places` array
Each place:

```ts
{
  id: string                          // kebab-case unique within trip
  name: string
  type: PlaceType
  homeBase?: string                   // FK to homeBases[].id
  area: string                        // free-text neighborhood
  coords: [lat: number, lng: number]
  mapsUrl?: string                    // absolute URL
  photos: PhotoRef[]                  // ≥1
  description: string
  notes?: string
  priority: string                    // FK to taxonomy.priorityTiers[].id
  zone: string | number               // FK to taxonomy.zones[].id
  cost: string                        // FK to taxonomy.costTiers[].id
  duration: number                    // minutes
  validSlots: string[]                // FK to taxonomy.slots[].id
  validDays?: ISODate[] | null        // null/omitted = any day in trip
  tags: string[]                      // free vocabulary
  pairs?: string[]                    // FKs to other place ids
  energy: string                      // FK to taxonomy.energy[].id
  weather?: string                    // FK to taxonomy.weatherFlags
  bookingRequired: boolean
  bookingUrl?: string
  openingHours?: string               // free text
}
```

`PhotoRef`:
```ts
{
  src: string                  // primary image URL
  alt: string                  // accessible description
  credit?: string              // attribution if applicable
  fallback?: string            // OPTIONAL fallback URL if `src` fails to load
}
```

`PlaceType` enum (closed):
```
'monument' | 'museum' | 'gallery' | 'beach' | 'food' | 'cafe' | 'nightlife'
| 'nature' | 'viewpoint' | 'hike' | 'flea-market' | 'artisan-market'
| 'indoor-market' | 'art-walk' | 'walk' | 'activity' | 'wellness'
| 'flamenco' | 'club' | 'bar' | 'shopping' | 'mystic' | 'aquarium'
| 'quirky' | 'daytrip' | 'logistics' | 'transit'
```

#### Scenario: Place with FK to non-existent priority tier
- **GIVEN** taxonomy.priorityTiers ids = `["must","recommended","optional","backup"]`
- **AND** a place with `priority: "essential"`
- **WHEN** validated
- **THEN** validation fails

#### Scenario: Place coords out of bounds
- **GIVEN** a place with `coords: [200, 500]`
- **WHEN** validated
- **THEN** validation fails (lat must be -90..90, lng must be -180..180)

### Requirement: `days` array
Each day:

```ts
{
  id: string                          // kebab-case unique
  date: ISODate                       // within trip range
  dayNum: number                      // 1..N
  homeBase?: string                   // FK
  theme: string
  travelMode: 'walking' | 'driving' | 'transit' | 'mixed'
  weatherNote?: string
  fixed?: FixedEvent[]
}
```

`FixedEvent`:
```ts
{ name: string, time?: string, type: 'transit'|'booking'|'event', placeId?: string, notes?: string }
```

The `days` array SHALL contain consecutive dates from `trip.startDate` to `trip.endDate`, inclusive, with no gaps.

#### Scenario: Days with a gap
- **GIVEN** trip 2026-05-12 → 2026-05-15 with days `["2026-05-12", "2026-05-14", "2026-05-15"]`
- **WHEN** validated
- **THEN** validation fails (missing 2026-05-13)

### Requirement: `presets` object (optional)
Pre-set state to apply on first load (and merged into user state):

```ts
{
  states?: Record<PlaceId, PlaceState>      // place id → initial state
  scheduled?: Record<DayId, Record<SlotId, PlaceId[]>>
}
```

Presets SHALL be applied only ONCE per trip ID, on first load, and remembered (so re-loading the JSON doesn't overwrite user changes).

#### Scenario: Whale watching preset
- **GIVEN** `presets.scheduled["day-07"]["morning"] = ["trf-whale"]`
- **WHEN** the user loads this trip for the first time
- **THEN** `trf-whale` appears as scheduled on Day 7 morning
- **AND** its state is `scheduled`

#### Scenario: User overrides preset, then reloads
- **GIVEN** a preset placed `trf-whale` on Day 7 morning
- **AND** the user moves it to Day 7 afternoon
- **WHEN** the trip JSON is re-fetched
- **THEN** `trf-whale` remains on Day 7 afternoon (user state wins)

### Requirement: Schema versioning
The `$schema` field SHALL match `trip-app/<MAJOR>.<MINOR>.<PATCH>` (semver).

- **MAJOR** mismatch → app refuses to load (incompatible)
- **MINOR > app's known minor** → app loads with a warning
- **MINOR ≤ app's known minor** → app loads silently
- **PATCH** difference → ignored

#### Scenario: Future-major trip
- **GIVEN** the app supports `v1.x.x` and a JSON has `$schema: "trip-app/v2.0.0"`
- **WHEN** loaded
- **THEN** validation fails with an "incompatible schema major version" message

### Requirement: ID uniqueness
Within a single trip JSON, `places[].id` and `days[].id` and `homeBases[].id` SHALL each be unique within their respective arrays. Cross-array collisions are allowed (e.g. a place id and a home-base id MAY share a string).

#### Scenario: Duplicate place id
- **GIVEN** two `places[]` entries with `id: "mlg-alcazaba"`
- **WHEN** validated
- **THEN** validation fails listing the duplicate id
