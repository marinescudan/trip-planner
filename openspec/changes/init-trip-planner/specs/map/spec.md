# Spec Delta: Map Integration

## ADDED Requirements

### Requirement: Per-place Maps link
Every `Place` (except `type: 'logistics'`) SHALL render a "Maps" button that opens its `mapsUrl` in a new tab. If `mapsUrl` is empty, the button is hidden.

#### Scenario: Tap Maps on a card
- **GIVEN** a place card with `mapsUrl` set
- **WHEN** the user taps the "Maps" button
- **THEN** a new tab opens at the Google Maps URL
- **AND** focus returns to the source app on close

### Requirement: Day route URL builder
The system SHALL provide `buildDayRouteUrl(places: Place[]): string` that returns a Google Maps directions URL of the form:

```
https://www.google.com/maps/dir/{lat,lng}/{lat,lng}/.../{lat,lng}
```

Inputs are scheduled places ordered by slot ascending (morning → night). Places without coords are skipped. Maximum 9 stops per Google's URL limit; if more, the first 9 are used and a warning is shown.

#### Scenario: Single stop
- **GIVEN** Day 4 has only `mlg-ronda` scheduled
- **WHEN** `buildDayRouteUrl([rondaPlace])` is called
- **THEN** it returns `https://www.google.com/maps/?q=36.7424,-5.1656` (single-place URL, not directions)

#### Scenario: Multiple stops
- **GIVEN** Day 6 has 4 places scheduled across morning, lunch, afternoon, dinner
- **WHEN** `buildDayRouteUrl(places)` is called with the 4 places in order
- **THEN** the URL has exactly 4 coordinate segments after `/dir/`

#### Scenario: Too many stops
- **GIVEN** Day 5 has 11 places scheduled
- **WHEN** `buildDayRouteUrl(places)` is called
- **THEN** the URL contains the first 9 places only
- **AND** the calling component shows a warning "Showing first 9 of 11 stops"

### Requirement: Inline map preview
The `PlaceDetails` view SHALL include a small Leaflet-based map preview centered on the place's coords, with a single marker. Tile source: OpenStreetMap (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`).

#### Scenario: Map preview renders
- **GIVEN** the user opens details for `trf-bolonia`
- **WHEN** the modal is visible
- **THEN** a Leaflet map renders within 500ms showing a marker at the place's coords
- **AND** zoom controls are visible

#### Scenario: Offline map fallback
- **GIVEN** the user is offline (no tile server)
- **WHEN** PlaceDetails opens
- **THEN** an empty map area shows a "Map unavailable offline" message
- **AND** the rest of the details (text, photos) still render

### Requirement: Coordinate validation
All coordinates in `places.json` SHALL be valid decimal degrees within the trip area (lat 35.5–38.5, lng -7 to -2). The build-time validation test SHALL fail if any place has out-of-range coords.

#### Scenario: Invalid coords
- **GIVEN** a place entry with `coords: [0, 0]`
- **WHEN** `pnpm test` runs
- **THEN** the test fails identifying the place id and out-of-range field

### Requirement: Walking vs driving routes
The "Open route" button SHALL respect the day's transit mode. The day metadata in `days.json` includes `travelMode: 'walking' | 'driving' | 'transit' | 'mixed'`. The Maps URL SHALL append a `travelmode=` parameter accordingly.

#### Scenario: Walking day
- **GIVEN** Day 1 has `travelMode: 'walking'`
- **WHEN** "Open route" is clicked
- **THEN** the URL includes `?travelmode=walking`

#### Scenario: Driving day (Tarifa)
- **GIVEN** Day 7 (Bolonia) has `travelMode: 'driving'`
- **WHEN** "Open route" is clicked
- **THEN** the URL includes `?travelmode=driving`
