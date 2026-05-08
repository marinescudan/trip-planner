# Spec Delta: PWA

## ADDED Requirements

### Requirement: Installable
The app SHALL be installable as a Progressive Web App on iOS Safari, Android Chrome, and desktop Chrome/Edge. The install footprint SHALL include name, short name, icons (192/512/maskable), theme color, display mode `standalone`, start URL `/`, and scope `/`.

#### Scenario: Install prompt on Android Chrome
- **GIVEN** the user visits the deployed app on Android Chrome for the second time
- **WHEN** Chrome fires `beforeinstallprompt`
- **THEN** the app captures the event
- **AND** surfaces a small "Install app" affordance in the settings menu
- **AND** when tapped, presents the native install prompt

#### Scenario: Install on iOS Safari
- **GIVEN** the user visits on iOS Safari (no `beforeinstallprompt` available)
- **WHEN** they use Share → Add to Home Screen
- **THEN** the app is added with the correct icon, name, and theme color
- **AND** opens in standalone mode (no Safari chrome)

### Requirement: Service worker
The app SHALL register a Workbox-based service worker (via `@vite-pwa/nuxt`) that:

- Precaches the app shell (HTML, JS, CSS, fonts) on first install
- Auto-updates when a new build is detected (`registerType: 'autoUpdate'`)
- Notifies the user when an update is available with a small "Refresh" toast
- Skips waiting on user accept

#### Scenario: Update available
- **GIVEN** the user has the v1 build cached
- **WHEN** v1.1 is deployed and the user revisits
- **THEN** the SW detects the new build
- **AND** a toast appears: "New version ready — Refresh"
- **AND** tapping refresh activates the new SW immediately

### Requirement: Runtime caching strategy
The service worker SHALL apply these strategies:

| URL pattern | Strategy | Max age | Max entries |
|---|---|---|---|
| `/trip.json` | NetworkFirst | 24h | 1 |
| Same-origin images (`*.png/jpg/webp/svg`) | CacheFirst | 30d | 100 |
| `tile.openstreetmap.org` | CacheFirst | 90d | 200 |
| `picsum.photos` | CacheFirst | 90d | 300 |
| `upload.wikimedia.org` | CacheFirst | 90d | 300 |
| `images.unsplash.com` | CacheFirst | 90d | 300 |

#### Scenario: Repeat visit on same network
- **GIVEN** the user has visited the app once
- **WHEN** they revisit within 24 hours
- **THEN** `/trip.json` is served from cache without revalidation
- **AND** the day list is interactive within 1 second

### Requirement: Offline boot
The app SHALL boot offline IF the user has loaded the active trip at least once while online. The SW handles HTML/JS/CSS; localStorage holds the trip JSON snapshot as a fallback if the network request fails AND the SW cache misses.

#### Scenario: Offline boot
- **GIVEN** the user previously loaded the trip while online
- **WHEN** they open the app in airplane mode
- **THEN** the app shell loads from SW cache
- **AND** the trip data loads from SW cache OR localStorage snapshot
- **AND** all 12 days, 159 places render
- **AND** state mutations queue locally (per state spec) until reconnection

#### Scenario: Cold first visit offline
- **GIVEN** a brand-new user with no cached state
- **WHEN** they try to open the app while offline
- **THEN** the browser shows its native offline page
- **AND** no half-broken app state is presented

### Requirement: Theme color & status bar
The PWA manifest SHALL declare:
- `theme_color` matching `trip.theme.primary` (default `#0369a1`)
- `background_color` matching `trip.theme.bg` (default `#fefcf9`)

iOS-specific meta tags SHALL be present:
- `apple-mobile-web-app-capable: yes`
- `apple-mobile-web-app-status-bar-style: default`
- `apple-touch-icon` linking the 192px icon

#### Scenario: Status bar matches theme
- **GIVEN** the app is installed on iOS standalone
- **WHEN** opened
- **THEN** the status bar tint matches the trip primary color

### Requirement: No notifications, no background sync (v1)
The PWA SHALL NOT request push notification permission. The PWA SHALL NOT use Background Sync API. These are out of scope for v1; future changes may add them.

### Requirement: Manifest from trip when installed
The default manifest values come from the build-time default trip. If the user later loads a different trip via `?trip=URL`, the in-app theme adapts via CSS variables, but the installed PWA's manifest does NOT change (browsers cache it). This is a known limitation acceptable for v1.
