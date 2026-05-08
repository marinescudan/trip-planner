# Spec Delta: UI Shell

## ADDED Requirements

### Requirement: Top app bar
The app SHALL render a sticky top bar with:
- Trip title from `trip.title` and subtitle from `trip.subtitle` (if present)
- Date range derived from `trip.startDate` and `trip.endDate`
- Day-count progress: "Day {n} of {total}" computed from current date and trip dates (or "Pre-trip" / "Trip ended" outside range)
- Trip switcher dropdown (locker entries + "Load another trip…")
- Settings menu (3-dot) containing: Export plan, Import plan, Reset all state, About

#### Scenario: Top bar during the active trip
- **GIVEN** the user opens the Málaga trip on `2026-05-15`
- **WHEN** the top bar renders
- **THEN** title shows "Málaga + Tarifa", "Day 4 of 12" is displayed
- **AND** today's date is highlighted in the day list below

#### Scenario: Top bar with non-Málaga trip
- **GIVEN** a future Barcelona trip with title "Barcelona Long Weekend", 4 days
- **WHEN** the top bar renders
- **THEN** the title shows "Barcelona Long Weekend"
- **AND** day count shows "X of 4"

### Requirement: Layout breakpoints
The system SHALL adapt to viewports as follows:

- `< 640px` (phone): single column. Filter rail = bottom drawer. Day accordion full width. Slot scrollers swipeable.
- `640px – 1024px` (tablet): single column with wider cards.
- `≥ 1024px` (desktop): two-column. Sticky filter rail on left (~280px), day list in remaining space.

#### Scenario: Touch device on a phone
- **GIVEN** viewport width is 390px
- **WHEN** the user swipes horizontally on a slot row
- **THEN** the slot scroller scrolls smoothly with momentum
- **AND** vertical page scroll is not triggered

### Requirement: Color theme
The system SHALL apply colors from `trip.theme` (with fallback defaults). Priority colors come from `trip.taxonomy.priorityTiers[].color`.

Defaults if `trip.theme` is omitted:
- Primary: `#0ea5e9`
- Accent: `#a855f7`
- Background: warm off-white `#fefcf9`
- Text primary: `#1e293b`
- Borders: `#e2e8f0`

For the Málaga trip, theme provides primary `#0ea5e9` (sea blue) and accent `#a855f7` (sunset purple).

These SHALL be exposed as CSS custom properties on `:root`, with priority colors as `--color-priority-<id>`.

#### Scenario: Priority dot color
- **GIVEN** a place with `priority: 'must'` in a trip whose `priorityTiers[id=must].color = "#ef4444"`
- **WHEN** its card renders
- **THEN** the priority dot uses CSS variable `--color-priority-must`
- **AND** the resolved color is `#ef4444`

### Requirement: Performance budget
The page SHALL meet these targets on a mid-tier phone over 4G:

- First Contentful Paint < 1.8s
- Time to Interactive < 3.0s
- Initial JS bundle < 200KB gzipped
- Initial data payload (places.json + days.json) < 250KB gzipped

Photos SHALL lazy-load below the fold. Leaflet SHALL load only when `PlaceDetails` opens (dynamic import).

#### Scenario: Cold load on 4G
- **GIVEN** a fresh browser on a throttled 4G connection
- **WHEN** the user navigates to the app
- **THEN** the day list is interactive within 3 seconds

### Requirement: Accessibility
The system SHALL meet WCAG 2.1 AA in the following respects:
- All interactive elements reachable via keyboard
- Focus rings visible on all controls
- Contrast ratios ≥ 4.5:1 for body text, ≥ 3:1 for large text
- Slot scrollers expose left/right arrow buttons (not scroll-only) for keyboard users
- State button announces state changes to screen readers via `aria-live`

#### Scenario: Keyboard navigation through a slot
- **GIVEN** focus is on the first card in a slot scroller
- **WHEN** the user presses Right Arrow
- **THEN** focus moves to the next card
- **AND** the scroller scrolls to bring it into view

### Requirement: Print stylesheet
The system SHALL include a `@media print` stylesheet that:
- Expands all day accordions
- Hides the filter rail and top bar
- Lists scheduled places per day in slot order with name, area, address
- Fits one day per page (page break per day)

#### Scenario: Print preview
- **GIVEN** the user has a complete plan
- **WHEN** they trigger browser print
- **THEN** the preview shows 12 pages, one per day
- **AND** filter rail is absent

### Requirement: Empty states
The system SHALL render explicit empty-state messages with helpful copy in the following cases:

- Filter combo hides all places: "No places match. Reset filters?"
- Slot has no scheduled or suggested places: "Nothing planned. Try Surprise me 🎲"
- Search returns no results: "Nothing matches '<query>'."

Each empty state SHALL include a one-tap action to relieve the empty condition.
