# Spec Delta: Itinerary

## ADDED Requirements

### Requirement: Day list ordering
The itinerary SHALL render exactly the days defined in `trip.days[]` in chronological order from `trip.startDate` to `trip.endDate`. Each day SHALL be rendered as a collapsible accordion section.

#### Scenario: Default open day
- **GIVEN** the user opens the app on `2026-05-15`
- **WHEN** the page renders
- **THEN** Day 4 (May 15) is expanded by default
- **AND** all other days are collapsed

#### Scenario: Default open day before trip
- **GIVEN** the user opens the app on `2026-05-08` (before trip)
- **WHEN** the page renders
- **THEN** Day 1 (May 12) is expanded by default

#### Scenario: Default open day after trip
- **GIVEN** the user opens the app on `2026-06-01` (after trip)
- **WHEN** the page renders
- **THEN** all days are collapsed; a single banner offers to "Show full trip"

### Requirement: Day header content
Each day header SHALL show:

- Day number ("Day 4")
- ISO date and weekday in user's locale
- City badge ("Málaga 1" / "Tarifa" / "Málaga 2")
- Theme text (editable in v2; static from `days.json` in v1)
- Count of scheduled places ("5 scheduled")
- "Open route in Maps" button

#### Scenario: Open route with no scheduled places
- **GIVEN** Day 1 has no places assigned to any slot
- **WHEN** the user clicks "Open route"
- **THEN** the button is disabled with tooltip "Schedule at least one place"

#### Scenario: Open route with multiple stops
- **GIVEN** Day 5 has 3 places scheduled across morning, lunch, afternoon
- **WHEN** the user clicks "Open route"
- **THEN** a new tab opens at `https://www.google.com/maps/dir/{lat,lng}/{lat,lng}/{lat,lng}` in slot order

### Requirement: Slot rendering
Each day SHALL render in one of two view modes per the `Day view mode toggle` requirement:

- **Flat (default)**: a single chronological list of scheduled places per day, ordered by `taxonomy.slots[].order` then by user insertion order within each slot. Below the scheduled list, the day SHALL render exactly one **Suggestions** group containing the top-8 candidates across the whole day, plus exactly one **Surprise me 🎲** button at day scope.
- **Grouped (toggle)**: per-slot rendering in the order defined by `trip.taxonomy.slots[]` sorted by their `order` field. Each slot row SHALL contain two horizontally-scrollable groups separated by a divider:
  1. **Scheduled** — places the user has explicitly assigned to this slot for this day, in user-defined order
  2. **Suggestions** — top 5 places per slot matching the predicates below
  Empty slots in grouped mode SHALL collapse (driven by the `hide-if-empty` prop on `SlotRow`). A "Show all (n)" link expands suggestions to the full filtered list.

The number of slots is trip-defined; default Málaga trip uses seven (morning, lunch, afternoon, snack, evening, dinner, night), but the renderer MUST handle any N≥1.

Both modes share the same suggestion predicates: a place is a candidate when ALL of the following hold:
- `validSlots` intersects any slot in `trip.taxonomy.slots` (in flat mode), or `validSlots includes <slot>` (in grouped mode)
- current filters allow the place
- place state ∉ `{skipped}` (skipped places are reachable only via the slot footer in grouped mode)
- `validDays` allows this date
- place is not already scheduled in another slot of this same day

Suggestions SHALL be sorted by priority then alphabetically.

#### Scenario: Default flat
- **GIVEN** a fresh trip with no per-day overrides
- **WHEN** any day renders
- **THEN** the day shows a single chronological list of scheduled places
- **AND** a single "Suggestions" group with up to 8 candidates
- **AND** a single "Surprise me 🎲" button at day scope

#### Scenario: Grouped restores per-slot suggestion count
- **GIVEN** the user toggles `Group by slot` on Day 1
- **WHEN** Day 1 re-renders
- **THEN** each non-empty slot row shows its own top-5 suggestions list
- **AND** empty slots collapse out of view

#### Scenario: Suggestions exclude scheduled-elsewhere-today
- **GIVEN** place `mlg-alcazaba` is scheduled for Day 2 morning
- **WHEN** Day 2 afternoon suggestions are computed
- **THEN** `mlg-alcazaba` is NOT in the suggestion list

#### Scenario: Suggestions include same place across days
- **GIVEN** place `mlg-pimpi` is scheduled for Day 1 dinner
- **WHEN** Day 9 dinner suggestions are computed
- **THEN** `mlg-pimpi` IS in the suggestion list (subject to other filters)

#### Scenario: Slot mismatch hides place
- **GIVEN** place `mlg-trinchera` (a club) has `validSlots: ['night']`
- **WHEN** the morning slot for any day is rendered
- **THEN** `mlg-trinchera` is NOT in suggestions

### Requirement: Day view mode toggle
Each day SHALL expose a switch in its day header that flips the day between **flat** (default) and **grouped** view modes. The selection SHALL be stored per-day in `trip:<id>:dayViewMode` (a `Record<DayId, 'flat' | 'grouped'>`) so refreshing the page restores the per-day choice.

#### Scenario: Default flat
- **GIVEN** a fresh trip with no stored `dayViewMode` entries
- **WHEN** any day renders
- **THEN** every day uses flat mode
- **AND** the day-header `Group by slot` switch reads off

#### Scenario: Toggle persists per-day
- **GIVEN** the user calls `setGrouped('d1', true)` on Day 1
- **WHEN** the page reloads
- **THEN** Day 1 renders in grouped mode
- **AND** every other day remains in flat mode

#### Scenario: Cross-trip isolation
- **GIVEN** the user has set Day 1 grouped on Trip A
- **WHEN** the user switches to Trip B in the trip locker
- **THEN** the in-memory `dayViewMode` map resets
- **AND** every day on Trip B starts in flat mode

### Requirement: Add-to-slot dropdown
On suggestion cards rendered in flat mode, the action footer SHALL render an `AddToSlotMenu` dropdown trigger in place of the legacy `[+]` button. Selecting an item SHALL call `useDayPlan().assignToSlot(dayId, slotId, placeId)` and the chosen place SHALL appear immediately in the day's scheduled list.

#### Scenario: Items match `taxonomy.slots ∩ place.validSlots`
- **GIVEN** a place with `validSlots: ['morning', 'dinner']`
- **AND** a trip whose taxonomy declares 7 slots
- **WHEN** the user opens the add-to-slot dropdown for that place
- **THEN** the dropdown lists exactly two items: morning and dinner
- **AND** items are ordered by `slot.order`

#### Scenario: Selecting calls `assignToSlot(dayId, slotId, placeId)`
- **GIVEN** a place visible in the Day 3 suggestions list (flat mode)
- **WHEN** the user picks "Morning" from the add-to-slot dropdown
- **THEN** `useDayPlan().assignToSlot('d3', 'morning', <placeId>)` is invoked
- **AND** the place appears at the top of the Day 3 scheduled list
- **AND** the suggestion's "+" trigger is replaced by a "scheduled" affordance

#### Scenario: Surprise me (flat)
- **GIVEN** Day 5 is in flat mode with at least one valid suggestion
- **WHEN** the user clicks the day-scope "Surprise me 🎲" button
- **THEN** one place is picked from the top-8 suggestions
- **AND** the place is assigned to the earliest valid slot present in `taxonomy.slots`

### Requirement: Place card in slot
Each card in a slot SHALL display:

- Hero photo (lazy-loaded)
- Name
- Area
- Cost tier symbol
- Duration
- Priority dot (color-coded)
- State button
- Optional tag pills (max 3 visible)
- City proximity badge (see *City proximity badge* in `ux-design`) — the canonical glanceable encoding of "how far is this from where I'm staying"; replaces the previously-required inline zone label

Tapping the card opens `PlaceDetails` with full info.

#### Scenario: State change from card
- **GIVEN** a card showing place `mlg-cac` in `untouched` state
- **WHEN** the user taps the state button
- **THEN** the state advances to `wishlist`
- **AND** the change persists to localStorage within 250ms

### Requirement: Surprise me action
The "🎲 Surprise me" button SHALL randomly select one place from the current candidate list and assign it as scheduled in an appropriate slot. Its scope depends on the active view mode:

- **Grouped mode**: each slot row exposes its own button, picking from that slot's top-5 suggestions and assigning to that slot.
- **Flat mode**: each day exposes a single day-scope button, picking from the day's top-8 suggestions and auto-assigning to the earliest slot in `taxonomy.slots` (sorted by `order`) that intersects the chosen place's `validSlots`.

#### Scenario: Surprise with empty suggestions
- **GIVEN** filters are configured such that 0 suggestions exist for Day 3 morning
- **WHEN** "Surprise me" is clicked
- **THEN** no assignment is made
- **AND** an inline message reads "No suggestions match your filters"

### Requirement: Hidden section
Each slot row SHALL show a collapsed footer "N skipped — show" when one or more places valid for that slot have state `skipped`. Expanding shows skipped places with reduced opacity and a "restore" button to return them to `untouched`.

#### Scenario: Restore from skipped
- **GIVEN** place `mlg-pimpi` is in `skipped` state
- **WHEN** the user clicks "restore" on the dinner-slot hidden footer
- **THEN** `mlg-pimpi` returns to `untouched` state
- **AND** appears in the regular suggestions again
