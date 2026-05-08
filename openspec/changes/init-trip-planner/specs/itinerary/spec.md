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
Each day SHALL render slot rows in the order defined by `trip.taxonomy.slots[]` sorted by their `order` field. The number of slots is trip-defined; default Málaga trip uses seven (morning, lunch, afternoon, snack, evening, dinner, night), but the renderer MUST handle any N≥1.

Each slot row SHALL contain two horizontally-scrollable groups separated by a divider:
1. **Scheduled** — places the user has explicitly assigned to this slot for this day, in user-defined order
2. **Suggestions** — top 5 places matching all of: `validSlots includes <slot>`, current filters allow, place state ∉ `{skipped}`, `validDays` allows this date, place not already scheduled in another slot of this same day. Sorted by priority then alphabetically.

A "Show all (n)" link expands suggestions to the full filtered list.

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

### Requirement: Place card in slot
Each card in a slot SHALL display:

- Hero photo (lazy-loaded)
- Name
- Area + zone badge
- Cost tier symbol
- Duration
- Priority dot (color-coded)
- State button
- Optional tag pills (max 3 visible)

Tapping the card opens `PlaceDetails` with full info.

#### Scenario: State change from card
- **GIVEN** a card showing place `mlg-cac` in `untouched` state
- **WHEN** the user taps the state button
- **THEN** the state advances to `wishlist`
- **AND** the change persists to localStorage within 250ms

### Requirement: Surprise me action
Each slot row SHALL provide a "🎲 Surprise me" button that, when clicked, randomly selects one place from the current top-5 suggestions and assigns it as scheduled in that slot.

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
