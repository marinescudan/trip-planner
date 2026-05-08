# Spec Delta: Deployment

## ADDED Requirements

### Requirement: Vercel deployment
The system SHALL deploy to Vercel as a Nuxt 3 app using the `vercel` Nitro preset. The production URL SHALL be issued by Vercel (e.g. `trip-planner-<dan>.vercel.app`); a custom domain is optional.

#### Scenario: Successful deploy
- **GIVEN** the repo is connected to Vercel and `main` is pushed
- **WHEN** Vercel builds
- **THEN** `pnpm build` completes with exit code 0
- **AND** the resulting site loads at the issued URL
- **AND** Lighthouse Performance score on mobile ≥ 90

### Requirement: Build environment
The build SHALL use:
- Node.js 20.x
- pnpm
- `pnpm install --frozen-lockfile`
- `pnpm build`

Vercel's auto-detection of Nuxt 3 SHALL be used; no override needed unless the auto-detection fails.

#### Scenario: Lockfile mismatch
- **GIVEN** `package.json` has been edited without updating `pnpm-lock.yaml`
- **WHEN** the build runs
- **THEN** the build fails with a lockfile mismatch error
- **AND** does NOT deploy

### Requirement: Build-time data validation
The build SHALL run `pnpm test` (or at minimum a data-validation script) BEFORE bundling. If any place or day fails Zod validation, the build SHALL fail.

#### Scenario: Invalid data blocks deploy
- **GIVEN** `places.json` contains a place with `coords: ['x', 'y']`
- **WHEN** Vercel builds
- **THEN** the validation step fails
- **AND** the build does not proceed
- **AND** the failure log includes the invalid place id

### Requirement: Static asset caching
Built assets in `_nuxt/` SHALL be served with a long-term immutable cache header (handled automatically by Vercel for Nuxt). The `places.json` and `days.json` files SHALL also have aggressive caching (`public, max-age=86400`) since the data is fixed for the trip.

#### Scenario: Repeat visit
- **GIVEN** the user has visited the app once
- **WHEN** they revisit within 24 hours over the same network
- **THEN** all assets are served from browser cache without revalidation
- **AND** the app is interactive within 1 second

### Requirement: Privacy
The system SHALL NOT include analytics, tracking pixels, or third-party scripts beyond the bare minimum needed (Vercel platform observability only). User data SHALL NOT leave the browser.

#### Scenario: Network audit
- **GIVEN** the deployed app loads
- **WHEN** Network tab is inspected
- **THEN** all requests are to:
  - the Vercel-hosted origin
  - `tile.openstreetmap.org` (only when PlaceDetails map opens)
  - `www.google.com/maps/...` (only on outbound link clicks, not auto-loaded)

### Requirement: Error tracking (deferred)
v1 SHALL not include error tracking. If errors prove problematic during use, a future change MAY add Sentry or similar. Until then, console errors are acceptable.

### Requirement: Rollback
Vercel's atomic deploys SHALL serve as the rollback mechanism. Any deploy can be promoted/demoted via the Vercel dashboard.

#### Scenario: Bad deploy
- **GIVEN** a deploy ships with broken filter logic
- **WHEN** the user notices and reports
- **THEN** the previous good deploy can be re-promoted in <1 minute via Vercel UI
- **AND** the production URL serves the rolled-back version immediately

### Requirement: Environment variables
v1 SHALL require zero environment variables. The deploy SHALL succeed with no Vercel project env vars set.

#### Scenario: Fresh project setup
- **GIVEN** Dan creates a new Vercel project from the GitHub repo
- **WHEN** he triggers the first deploy without setting any env vars
- **THEN** the deploy succeeds and the app is fully functional
