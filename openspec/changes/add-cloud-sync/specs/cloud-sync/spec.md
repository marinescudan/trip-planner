# Spec Delta: Cloud Sync

## ADDED Requirements

### Requirement: Sync trigger
The app SHALL activate cloud sync if and only if the loaded trip JSON contains a non-empty `sync` object with `endpoint` and `tripId`. Otherwise, the app SHALL behave identically to v1 (LocalAdapter only).

#### Scenario: Trip without sync
- **GIVEN** a trip JSON with no `sync` field
- **WHEN** loaded
- **THEN** the app uses LocalAdapter
- **AND** no network requests are made to any sync endpoint
- **AND** the sync indicator does not appear

#### Scenario: Trip with sync
- **GIVEN** a trip JSON with `sync.endpoint = "https://x/api/sync"` and `sync.tripId = "malaga-2026"`
- **WHEN** loaded for the first time
- **THEN** the PIN gate appears before any state mutation is allowed
- **AND** the sync indicator appears in the top bar

### Requirement: PIN authentication
The app SHALL exchange a PIN for a 30-day session token via `POST /api/sync/auth`. The token SHALL be stored in `localStorage[trip:<id>:syncToken]` and sent as `Authorization: Bearer <token>` on all subsequent sync requests.

#### Scenario: Successful PIN entry
- **GIVEN** the user types the correct PIN
- **WHEN** they submit
- **THEN** a token is received and stored
- **AND** the PIN gate dismisses
- **AND** the sync indicator shows "✓ Synced"

#### Scenario: Wrong PIN
- **GIVEN** the user types an incorrect PIN
- **WHEN** they submit
- **THEN** the auth endpoint returns 401
- **AND** the input shakes and clears
- **AND** an error message reads "Incorrect PIN"

#### Scenario: Rate limit
- **GIVEN** 5 failed PIN attempts from the same IP in 5 minutes
- **WHEN** a 6th attempt is made
- **THEN** the auth endpoint returns 429
- **AND** the UI shows "Too many attempts. Try again in N minutes"

### Requirement: Optimistic local writes
On `useStorage().set()`, the CloudAdapter SHALL write to the local cache immediately (the UI updates synchronously) and queue the remote write asynchronously.

#### Scenario: Mark while online
- **GIVEN** the user marks a place as wishlist while online
- **WHEN** the click event fires
- **THEN** the UI updates within one frame
- **AND** within 500ms a PUT request is sent
- **AND** within ~1s the indicator transitions Syncing → Synced

#### Scenario: Mark while offline
- **GIVEN** the user is offline (no network)
- **WHEN** they mark a place as wishlist
- **THEN** the UI updates within one frame
- **AND** the write is appended to `trip:<id>:syncQueue`
- **AND** the indicator shows "Offline — N pending"

### Requirement: Sync indicator states
The top-bar sync indicator SHALL display exactly one of these states:

| State | Icon | Color | Meaning |
|---|---|---|---|
| `idle` | ✓ | green | All writes flushed; up to date |
| `syncing` | ⟳ | blue | Active write in flight |
| `pending` | ⏱ | amber | Queued writes awaiting retry |
| `offline` | ✕ | gray | No network; queue building |
| `error` | ! | red | Persistent failure (e.g. 5xx loop) |
| `needs-auth` | 🔒 | purple | Token missing or expired |

Tapping the indicator opens a small panel with: last successful sync time, queue length, manual "Sync now" button, "Sign out of this device" link.

### Requirement: Conflict handling
On `PUT` returning 409 (the remote was updated since the client's last read), the app SHALL refetch the remote value, merge it into local state, drop the queued write, and emit a "Synced from another device" toast.

#### Scenario: Two devices write same key
- **GIVEN** Dan and Raluca both mark different places at the same time
- **WHEN** the second write reaches the server
- **THEN** the server returns 409
- **AND** the client refetches the remote
- **AND** both Dan's and Raluca's marks are present after the merge
- **AND** a toast shows "Plan updated from another device"

Note: merging is per-key. The full place-states map is one key; merging means re-applying the local-only delta on top of the remote map. Conflicting entries on the same place id resolve to the local value (last-write-by-this-user-wins on this device).

### Requirement: Offline queue persistence
The sync queue SHALL be persisted to `localStorage[trip:<id>:syncQueue]` so that a browser refresh while offline does not lose pending writes.

#### Scenario: Refresh with pending queue
- **GIVEN** 3 writes are queued offline
- **WHEN** the user refreshes the page (still offline)
- **THEN** all 3 writes remain in the queue
- **AND** the indicator shows "Offline — 3 pending"
- **AND** when the device reconnects, the queue drains in order

### Requirement: Reconnect drain
When `window.online` fires, the app SHALL drain the queue oldest-first with sequential PUT requests, retrying with exponential backoff on transient errors (max 5 attempts per item).

### Requirement: Token expiry handling
On any sync request returning 401, the app SHALL clear the stored token, set `useSyncStatus` to `needs-auth`, and re-open the PIN gate. Local state SHALL remain intact during this transition.

#### Scenario: Token expired during use
- **GIVEN** the user has been offline for 31 days and the token is now expired
- **WHEN** they reconnect and an automatic sync attempt fires
- **THEN** the response is 401
- **AND** the PIN gate re-appears
- **AND** the queue is preserved (drained after re-auth)

### Requirement: Tenant isolation
The server SHALL enforce that a token issued for `tripId: A` cannot read or write keys belonging to `tripId: B`. The `tripId` claim in the token is the only authority on key scope.

#### Scenario: Cross-tenant attack
- **GIVEN** a token issued for trip A
- **WHEN** a client crafts a request to read `sync:B:trip:B:states`
- **THEN** the server returns 403
- **AND** logs the attempt

### Requirement: Server-side schema validation
On every `PUT`, the server SHALL parse the value with the same Zod schema the client uses. Invalid payloads return 400 with the issue list.

### Requirement: Sign-out
The app SHALL provide a "Sign out of this device" action that:
- Clears the token from localStorage
- Sets adapter back to LocalAdapter (writes go local only)
- Preserves local cache (the user can keep using the app offline)
- Does NOT clear the local state keys

#### Scenario: Sign-out and re-sign-in
- **GIVEN** the user signs out, then makes 5 local-only changes
- **WHEN** they sign back in with the PIN
- **THEN** the 5 local changes are pushed to the server (subject to 409 handling)
- **AND** the indicator shows "✓ Synced" once flushed
