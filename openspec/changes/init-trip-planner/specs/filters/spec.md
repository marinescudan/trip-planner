# Spec Delta: Filters

## ADDED Requirements

### Requirement: Filter rail
The system SHALL provide a persistent filter rail accessible from every view. On viewports ≥1024px, the rail is a sticky sidebar. On smaller viewports, the rail SHALL be a bottom-sheet drawer toggled by a "Filters" button.

#### Scenario: Mobile filter drawer
- **GIVEN** viewport width is 375px
- **WHEN** the user taps the "Filters" button
- **THEN** a drawer slides up from the bottom occupying ≥75% of the viewport
- **AND** dismissing it (tap outside or close button) restores the underlying scroll position

### Requirement: Priority tier filter
The filter rail SHALL render multi-select toggles for every priority tier defined in `trip.taxonomy.priorityTiers[]`, each colored with its `color` value. Default state: all selected.

For the Málaga trip, this renders as four toggles: 🔴 Must, 🟡 Recommended, 🟢 Optional, ⚪ Backup.

#### Scenario: Hiding optional and backup
- **GIVEN** all four priority toggles are on
- **WHEN** the user deselects "Optional" and "Backup"
- **THEN** suggestions in every slot show only must + recommended places
- **AND** the visible-place count badge updates everywhere

### Requirement: Zone filter
The filter rail SHALL render multi-select chips for every zone defined in `trip.taxonomy.zones[]`. Default: all selected.

Zones are trip-defined. For the Málaga trip:
- Zone 1: ≤10 min walk
- Zone 2: 10–25 min walk or short bus
- Zone 3: drive/bus, ≤30 min
- Zone 4: day trip, 30 min – 2 h

#### Scenario: Walking-day filter
- **GIVEN** the user selects only Zone 1 + 2
- **WHEN** any day's slot suggestions render
- **THEN** Zone 3 and Zone 4 places are excluded from suggestions

### Requirement: Cost filter
The filter rail SHALL render multi-select chips for every cost tier in `trip.taxonomy.costTiers[]`. Default: all selected. For the Málaga trip: Free, €, €€, €€€.

#### Scenario: Budget mode
- **GIVEN** the user selects only Free + €
- **WHEN** suggestions render
- **THEN** only places with cost `'free'` or `'€'` appear

### Requirement: Tag filter
The filter rail SHALL provide a tag chip strip showing the most-used tags from the catalog (top 20). Each chip is a multi-select toggle. Logic: OR across selected tags by default; an "AND" toggle switches semantics.

#### Scenario: OR semantics
- **GIVEN** chips `food` and `art` are selected; "AND" is off
- **WHEN** suggestions render
- **THEN** any place tagged `food` OR `art` is included

#### Scenario: AND semantics
- **GIVEN** chips `photo-friendly` and `golden-hour` are selected; "AND" is on
- **WHEN** suggestions render
- **THEN** only places tagged with BOTH `photo-friendly` and `golden-hour` are included

### Requirement: Search input
The filter rail SHALL contain a text search input that filters places by name, area, or any tag. Search is debounced at 200ms, case-insensitive, accent-insensitive ("Málaga" matches "malaga").

#### Scenario: Search match
- **GIVEN** the user types "bolonia"
- **WHEN** the debounce timer fires
- **THEN** all places with `bolonia` in name, area, or tags are surfaced
- **AND** non-matches are hidden until search is cleared

### Requirement: Filter persistence
All filter UI state SHALL persist to localStorage under key `trip:filters` and rehydrate on next visit.

#### Scenario: Filter survives reload
- **GIVEN** the user has selected Zone 1 + 2 and "must" + "recommended"
- **WHEN** they reload the page
- **THEN** the same filter state is active

### Requirement: Reset filters
The filter rail SHALL include a "Reset filters" action that returns all filter controls to their default state (all selected, search cleared, AND off). Place states are NOT affected.

#### Scenario: Reset preserves place states
- **GIVEN** the user has marked 8 places as `skipped` and tightly filtered
- **WHEN** they click "Reset filters"
- **THEN** all filter UI returns to defaults
- **AND** the 8 skipped places remain skipped

### Requirement: Show hidden toggle
The filter rail SHALL include a "Show hidden" toggle that, when on, includes places in state `skipped` in suggestions (but visually dimmed). Default: off.

#### Scenario: Hidden toggle on
- **GIVEN** 5 places are `skipped` and "Show hidden" is off
- **WHEN** the user enables "Show hidden"
- **THEN** those 5 places appear in suggestions where applicable, with reduced opacity and a "restore" button

### Requirement: Filter result count
The filter rail SHALL display a live count of "matching places" against the total catalog (e.g. "78 / 145").

#### Scenario: Count updates with filter changes
- **GIVEN** count shows "78 / 145"
- **WHEN** the user adds a tag filter that further narrows
- **THEN** the count updates to the new total within 200ms (debounce window)
