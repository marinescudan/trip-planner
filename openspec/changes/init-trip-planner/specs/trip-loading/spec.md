# Spec Delta: Trip Loading

## ADDED Requirements

### Requirement: Resolution priority
On boot, the app SHALL resolve the active trip in this order, stopping at the first success:

1. `?trip=<url>` query parameter — fetch and validate
2. `localStorage[trip:active]` — load the named trip from the locker
3. Default `/trip.json` — shipped with the build
4. Fall through to `/load` page (no trip → trip-loader UI)

If validation fails at any step, the app SHALL route to `/load` with diagnostics; it SHALL NOT silently fall through to a different trip.

#### Scenario: Boot with query param
- **GIVEN** the user navigates to `/?trip=https://example.com/my-trip.json`
- **WHEN** the app boots
- **THEN** the URL is fetched
- **AND** if valid, the trip is added to the locker, set active, and rendered
- **AND** the URL is replaced with `/` (clean URL after consumption)

#### Scenario: Boot with active locker entry
- **GIVEN** no query param and `trip:active = "malaga-tarifa-2026"` in localStorage
- **WHEN** the app boots
- **THEN** the trip is loaded from `trip:locker` cache or re-fetched if cached source URL exists
- **AND** rendered

#### Scenario: Boot fresh
- **GIVEN** an empty localStorage
- **WHEN** the app boots
- **THEN** `/trip.json` is fetched from the same origin
- **AND** the trip is added to the locker and rendered

#### Scenario: Default trip.json missing
- **GIVEN** `/trip.json` returns 404
- **WHEN** the app boots
- **THEN** the user is routed to `/load`
- **AND** an info banner reads "No default trip — load one"

### Requirement: `/load` page UI
The `/load` page SHALL provide three input methods:

1. **URL input** — user pastes an HTTPS URL, app fetches and validates
2. **File drop / file picker** — user provides a local JSON file
3. **Paste JSON** — user pastes raw JSON into a textarea

All three flow through the same validation path. On success, the trip is saved to the locker and made active. On failure, errors are displayed inline.

#### Scenario: Load by URL
- **GIVEN** the user is on `/load`
- **WHEN** they paste a valid URL and click "Load"
- **THEN** the URL is fetched (with appropriate CORS handling)
- **AND** the response is validated
- **AND** on success, the user is redirected to `/`

#### Scenario: Load invalid JSON
- **GIVEN** the user pastes `{ invalid json`
- **WHEN** they click "Load"
- **THEN** the JSON parse error is displayed
- **AND** the trip is not saved or activated

#### Scenario: Load schema-invalid JSON
- **GIVEN** the user provides JSON that parses but fails Zod validation (e.g. missing `places`)
- **WHEN** they submit
- **THEN** a list of human-readable schema errors is displayed
- **AND** the user can fix the JSON in the textarea and retry

### Requirement: Trip locker
The app SHALL maintain a list of loaded trips in `localStorage[trip:locker]`:

```ts
type LockerEntry = {
  id: string                          // trip.id
  title: string                       // trip.title
  source: 'default' | 'url' | 'upload' | 'paste'
  sourceUrl?: string                  // present if source === 'url'
  sourceJson: string                  // raw JSON for offline reload
  loadedAt: ISODateTime
}
```

The locker SHALL hold up to 10 entries. Adding the 11th evicts the least-recently-active.

#### Scenario: Adding a duplicate trip
- **GIVEN** `malaga-tarifa-2026` already in the locker
- **WHEN** the user loads it again (same URL)
- **THEN** the existing entry is updated (sourceJson refreshed, loadedAt updated)
- **AND** no duplicate entry is created

### Requirement: Trip switcher
The app SHALL provide a trip switcher in the top bar showing the current trip's title and a dropdown of locker entries. Selecting an entry SHALL switch the active trip without a full reload (composables re-bind to the new trip-scoped storage keys).

#### Scenario: Switch trips
- **GIVEN** the locker has trips A and B; trip A is active
- **WHEN** the user selects trip B
- **THEN** the URL becomes `/?trip=<B.sourceUrl>` if applicable, or just `/`
- **AND** `localStorage[trip:active] = "B.id"`
- **AND** the day list and filter rail re-render against trip B
- **AND** trip A's place states and assignments remain in localStorage untouched

### Requirement: Removing a trip
The trip switcher SHALL provide a "Remove from locker" action per entry. Removing SHALL delete only the locker entry; per-trip state keys (`trip:<id>:*`) are preserved unless the user opts in to "Also delete state".

#### Scenario: Remove preserves state
- **GIVEN** trip A is in the locker with 12 place states marked
- **WHEN** the user removes trip A from the locker
- **THEN** `trip:locker` no longer contains trip A
- **AND** `trip:A:states` still exists
- **AND** if the user re-loads trip A later, those states reappear

#### Scenario: Remove with state deletion
- **GIVEN** the same setup
- **WHEN** the user clicks "Remove and delete state"
- **THEN** the locker entry is removed
- **AND** all `trip:A:*` keys are deleted

### Requirement: CORS handling
When fetching a trip JSON URL, the app SHALL handle CORS errors gracefully by showing a clear message: "This URL doesn't allow cross-origin access. Download the file and upload it instead."

### Requirement: Offline reload
The full trip JSON SHALL be cached in the locker entry's `sourceJson`. On boot without network, the active trip loads from the cached JSON instead of re-fetching.

#### Scenario: Airplane mode boot
- **GIVEN** the user previously loaded the Málaga trip while online
- **WHEN** they open the app offline (airplane mode)
- **THEN** the trip loads from `trip:locker[active].sourceJson`
- **AND** the app is fully usable
