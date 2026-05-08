# Spec Delta: State & Persistence

## ADDED Requirements

### Requirement: Place state machine
Each place SHALL have exactly one of five states at any time:

```
'untouched' (default)
'wishlist'
'scheduled'
'done'
'skipped'
```

The state SHALL transition only via these allowed paths:

- `untouched` → `wishlist` | `scheduled` | `skipped`
- `wishlist` → `scheduled` | `skipped` | `untouched`
- `scheduled` → `done` | `skipped` | `wishlist`
- `done` → `untouched` | `skipped`
- `skipped` → `untouched`

#### Scenario: Default cycle
- **GIVEN** a place in state `untouched`
- **WHEN** the user clicks the state button
- **THEN** state advances to `wishlist`
- **WHEN** clicked again
- **THEN** state advances to `scheduled`
- **WHEN** clicked again
- **THEN** state advances to `done`
- **WHEN** clicked again
- **THEN** state returns to `untouched`

#### Scenario: Skip and restore
- **GIVEN** any place in any state
- **WHEN** the user long-presses (or right-clicks) the state button and selects "Skip"
- **THEN** state becomes `skipped` regardless of previous state

### Requirement: Auto-schedule on slot drop
When the user assigns a place to a day slot, its state SHALL transition to `scheduled` (if not already `done`).

#### Scenario: Wishlist → scheduled
- **GIVEN** place `mlg-pimpi` is in state `wishlist` and not assigned to any slot
- **WHEN** the user assigns it to Day 1 dinner
- **THEN** state becomes `scheduled`
- **AND** it is removed from any other slot of Day 1

#### Scenario: Done remains done
- **GIVEN** place `mlg-alcazaba` is in state `done` (already visited Day 2)
- **WHEN** the user assigns it again to Day 9
- **THEN** state remains `done`
- **AND** the assignment is recorded for Day 9

### Requirement: Storage adapter pattern
The system SHALL implement persistence through a `StorageAdapter` interface. v1 ships exactly one implementation: `LocalAdapter` (backed by `localStorage`). Future changes MAY add other adapters (Cloud, IndexedDB, in-memory test fixtures) without modifying composables that consume storage.

```ts
interface StorageAdapter {
  get<T>(key: string, schema: ZodSchema<T>): Promise<T | null>
  set<T>(key: string, value: T, schema: ZodSchema<T>): Promise<void>
  delete(key: string): Promise<void>
  list(prefix: string): Promise<string[]>
  subscribe?(key: string, cb: (value: unknown) => void): () => void
}
```

The adapter is selected once at app boot, based on whether `trip.sync` is present in the loaded trip JSON. v1 ignores `trip.sync` and always uses `LocalAdapter`.

#### Scenario: Adapter swap is non-breaking
- **GIVEN** all composables consume `useStorage()` (which delegates to the active adapter)
- **WHEN** a future change introduces `CloudAdapter`
- **THEN** no composable, component, or page must change
- **AND** only the adapter selection logic is touched

### Requirement: localStorage schema
The system SHALL use these localStorage keys, namespaced per trip:

**Global keys:**
- `trip:locker` — `LockerEntry[]` of saved trips
- `trip:active` — currently active trip ID

**Per-trip keys (replace `<id>` with the trip's `id`):**
- `trip:<id>:states` — `Record<PlaceId, PlaceState>` (only non-`untouched` stored)
- `trip:<id>:days` — day assignments shape
- `trip:<id>:filters` — filter UI state
- `trip:<id>:presetsApplied` — boolean, true once first-load presets are merged

All keys MUST be namespaced with the `trip:` prefix.

#### Scenario: Switching trips preserves both states
- **GIVEN** trip A has `mlg-pimpi: 'wishlist'` and trip B has `bcn-rambla: 'scheduled'`
- **WHEN** the user switches active trip from A to B
- **THEN** `trip:A:states` still contains `mlg-pimpi`
- **AND** `trip:B:states` still contains `bcn-rambla`
- **AND** the rendered list reflects only trip B's data

#### Scenario: Untouched states are not stored
- **GIVEN** all places in the active trip are in `untouched` state (initial visit, no actions)
- **WHEN** localStorage is inspected
- **THEN** `trip:<activeId>:states` is either absent or contains an empty object `{}`

#### Scenario: Reading after marking 3 places
- **GIVEN** the user has marked 3 places as `wishlist` in the Málaga trip
- **WHEN** localStorage is inspected
- **THEN** `trip:malaga-tarifa-2026:states` contains exactly 3 entries

### Requirement: Storage hydration
The system SHALL hydrate state from localStorage on app mount, validating with Zod. Invalid entries SHALL be discarded silently and replaced with defaults.

#### Scenario: Corrupted state value
- **GIVEN** `trip:placeStates` in localStorage contains `{ "mlg-alcazaba": "purple" }`
- **WHEN** the app hydrates
- **THEN** the invalid entry is discarded
- **AND** `mlg-alcazaba` is treated as `untouched`
- **AND** no error is shown to the user

#### Scenario: Old place id no longer in catalog
- **GIVEN** localStorage has a state entry for `mlg-deleted-spot` which is no longer in `places.json`
- **WHEN** the app hydrates
- **THEN** the orphan entry is silently dropped
- **AND** localStorage is rewritten without it on next save

### Requirement: Throttled writes
The storage layer SHALL throttle writes per key to a maximum of one every 200ms to avoid degrading performance on rapid state toggles.

#### Scenario: Rapid toggles
- **GIVEN** the user clicks the state button 5 times in 300ms
- **WHEN** the throttle window settles
- **THEN** localStorage receives exactly 1 or 2 writes for `trip:placeStates`
- **AND** the final stored state matches the in-memory state

### Requirement: SSR safety
All storage reads SHALL be guarded so they execute only in the browser. Server-side renders SHALL produce default values for state-dependent UI.

#### Scenario: SSR render
- **GIVEN** the page renders on the Vercel edge (server)
- **WHEN** `usePlaceState().getState('mlg-alcazaba')` is called during SSR
- **THEN** it returns `'untouched'` without throwing
- **AND** the actual stored state hydrates after mount

### Requirement: Manual reset
The system SHALL provide a settings action "Reset all state" that clears all three localStorage keys after explicit confirmation.

#### Scenario: Reset confirmation
- **GIVEN** the user has 50 place states and 30 day assignments
- **WHEN** they click "Reset all state"
- **THEN** a confirmation dialog asks them to type "RESET" to confirm
- **AND** only on correct input is storage cleared

### Requirement: Export / import
The system SHALL provide an "Export plan" action that downloads the current state as JSON, and an "Import plan" action that restores from such a JSON file. This serves as a manual backup and as a way to share the plan between Dan's and Raluca's devices.

#### Scenario: Round-trip export/import
- **GIVEN** Dan exports his plan to `trip-plan.json`
- **WHEN** Raluca opens the app on her phone and imports the file
- **THEN** her localStorage contains identical state
- **AND** the rendered itinerary is the same as Dan's
