# Spec Delta: Trip Data — Málaga + Tarifa 2026

This spec describes the **content quality bar** for the first shipped trip JSON. The trip-schema spec defines the shape; this spec defines what "good content" means for our specific trip.

## ADDED Requirements

### Requirement: Catalog completeness
The Málaga 2026 trip JSON SHALL contain at least 130 places (current target: ~145), spanning Málaga, Tarifa, day trips, and trip logistics. Every entry MUST conform to the schema in `trip-schema/spec.md`.

#### Scenario: Catalog category coverage
- **GIVEN** the trip JSON is loaded
- **WHEN** places are grouped by `type`
- **THEN** at minimum these types each have ≥1 entry: `monument`, `museum`, `gallery`, `beach`, `food`, `cafe`, `nightlife`, `nature`, `viewpoint`, `hike`, `flea-market`, `art-walk`, `walk`, `activity`, `wellness`, `flamenco`, `club`, `bar`, `daytrip`, `logistics`

### Requirement: Required time-locked entries
The catalog SHALL include — with correct `validDays` constraints — these recurring market entries:

- **Sunday Recinto Ferial flea market** — `validDays: ["2026-05-17"]`
- **Wednesday Cortijo de Torres mercadillo** — `validDays: ["2026-05-13", "2026-05-20"]`
- **Saturday El Palo market** — `validDays: ["2026-05-16", "2026-05-23"]`
- **Saturday Mercadillo Ecológico Reding/Huelin** — `validDays: ["2026-05-16"]`

#### Scenario: Day-locked filtering on a wrong day
- **GIVEN** Day 1 (Tue May 12) is being viewed
- **WHEN** suggestions for any slot are computed
- **THEN** the Sunday Recinto Ferial entry is NOT shown
- **AND** the Wednesday Cortijo entry is NOT shown

### Requirement: Priority distribution
The catalog SHALL designate places across priority tiers approximately as:

- `must`: 12–18 places (the trip's spine)
- `recommended`: 25–40 places
- `optional`: 50–80 places
- `backup`: rest

Hard rule: **no more than 20%** of places should be `must` to preserve signal.

### Requirement: Birthday dinner candidates
The catalog SHALL include at least three Tarifa restaurant entries with sea view that meet:
- `type: 'food'`
- `priority: 'recommended'` or higher
- `validSlots` includes `'dinner'`
- tag `sea-view`
- `validDays` either omitted or includes `2026-05-18`

These are explicit candidates for Raluca's birthday dinner.

#### Scenario: Birthday dinner shortlist
- **GIVEN** the catalog
- **WHEN** filtered by city Tarifa, type food, dinner slot, tag `sea-view`
- **THEN** at least 3 results are returned

### Requirement: Photo coverage
- 100% of places SHALL have at least one `PhotoRef`.
- 100% of `must`-tier places SHALL have an actual hero photo (not a placeholder).
- Recommended-tier places MAY use Unsplash placeholders keyed by tags.

### Requirement: Coordinates within bounds
All place coordinates SHALL fall within the bounding box of southern Spain + Strait of Gibraltar:
- lat: 35.5 – 38.5
- lng: -7.0 – -2.0

This excludes Tangier (Morocco) — for Tangier, the place SHALL still be included with its real coordinates AND tagged `extra-territory`. Tangier is a known exception.

#### Scenario: Tangier as exception
- **GIVEN** a place `trf-tangier` with lat ~35.78, lng ~-5.81
- **WHEN** validated
- **THEN** validation succeeds (special exception for `extra-territory`-tagged entries)

### Requirement: Tag vocabulary
The trip JSON SHALL use a consistent tag vocabulary including (non-exhaustive):

`history`, `views`, `walking`, `photo-friendly`, `golden-hour`, `food`, `tapas`, `seafood`, `vegetarian`, `vegan`, `coffee`, `brunch`, `night-owl`, `romantic`, `birthday`, `family`, `nature`, `hike`, `swim`, `kitesurf`, `art`, `street-art`, `museum`, `architecture`, `flea-market`, `local`, `touristy`, `quirky`, `mystic`, `free`, `budget`, `luxury`, `windy`, `indoor`, `outdoor`, `rainy-day`, `raluca-camera`, `sea-view`, `extra-territory`

The `raluca-camera` tag SHALL be applied to ≥15 places that are visually distinctive enough to merit a film photograph.

### Requirement: Pairs metadata
At least the following pair groups SHALL be defined via `pairs`:

- Bolonia ↔ Baelo Claudia ↔ Las Rejas (Bolonia)
- Alcazaba ↔ Gibralfaro ↔ Roman Theatre
- Pedregalejo ↔ El Tintero ↔ Pedregalejo paseo
- Soho ↔ CAC Málaga ↔ MAUS murals
- Mercadillo Recinto Ferial ↔ El Zoco Muelle Uno (same Sunday)

### Requirement: Day theme assignments
All 12 days SHALL have `theme` values reflecting the discussed plan:

| Day | Date | Theme (suggested) | Home base |
|---|---|---|---|
| 1 | 2026-05-12 | "Arrival & old town" | malaga-1 |
| 2 | 2026-05-13 | "Alcazaba + tapas" | malaga-1 |
| 3 | 2026-05-14 | "Day trip: Caminito del Rey" | malaga-1 |
| 4 | 2026-05-15 | "Day trip: Ronda" | malaga-1 |
| 5 | 2026-05-16 | "Beach & Pedregalejo" | malaga-1 |
| 6 | 2026-05-17 | "Recinto Ferial → drive Tarifa" | transit |
| 7 | 2026-05-18 | "Birthday — whale watching" | tarifa |
| 8 | 2026-05-19 | "Bolonia full day" | tarifa |
| 9 | 2026-05-20 | "Drive back to Málaga" | transit |
| 10 | 2026-05-21 | "Day trip: Nerja or Granada" | malaga-2 |
| 11 | 2026-05-22 | "Soho art crawl + Hammam" | malaga-2 |
| 12 | 2026-05-23 | "Last beach + flight" | malaga-2 |

Themes are editable by the user in app; this spec defines defaults shipped in the JSON.

### Requirement: Presets for already-booked items
The JSON SHALL preset the following as `scheduled`:

- `trf-whale` (whale watching) — Day 7 morning
- Whatever is booked at time of authoring (Caminito tickets, Alhambra, Mandrágora reservation if confirmed)

#### Scenario: Whale watching preset present
- **GIVEN** the loaded trip
- **WHEN** Day 7 morning is rendered for the first time
- **THEN** `trf-whale` appears as scheduled (not just suggested)
