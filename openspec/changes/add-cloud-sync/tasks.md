# Tasks: Add Cloud Sync

`[P]` = parallel-safe within phase. Mark `[x]` as complete. Commit between tasks.

## Phase 1: Trip schema v1.1

- [ ] 1.1 Update `types/trip.ts` to add `sync?: { endpoint, tripId, label? }`
- [ ] 1.2 Update `utils/schema.ts` Zod tripSchema to accept the optional `sync` field
- [ ] 1.3 Bump trip schema constant to `trip-app/v1.1.0`
- [ ] 1.4 Update `specs/trip-schema/spec.md` archived spec to add `sync` field (after archive of `init-trip-planner`)
- [ ] 1.5 Verification: trips without `sync` continue to load identically; trips with `sync` parse correctly

## Phase 2: Backend (Vercel functions)

- [ ] 2.1 [P] Install: `pnpm add bcryptjs jose @vercel/kv`
- [ ] 2.2 [P] Install dev: `pnpm add -D @types/bcryptjs`
- [ ] 2.3 Create `server/api/sync/auth.post.ts` — PIN exchange for JWT
- [ ] 2.4 Create `server/api/sync/keys/[key].get.ts` — read with auth
- [ ] 2.5 Create `server/api/sync/keys/[key].put.ts` — write with auth + 409 conflict logic
- [ ] 2.6 Create `server/api/sync/keys/[key].delete.ts` — delete with auth
- [ ] 2.7 Create `server/api/sync/keys/index.get.ts` — list keys by prefix
- [ ] 2.8 Create `server/utils/auth.ts` — JWT verify helper, returns tripId or throws
- [ ] 2.9 Create `server/utils/rate-limit.ts` — KV-backed counter, 5 attempts / 5 min per IP
- [ ] 2.10 Tests: each route in `tests/api/sync/`
- [ ] 2.11 Verification: `pnpm dev`, manually exercise endpoints with curl + valid/invalid PINs

## Phase 3: CloudAdapter

- [ ] 3.1 Create `utils/storage/cloud-adapter.ts` implementing `StorageAdapter`
- [ ] 3.2 CloudAdapter wraps a LocalAdapter for cache + offline queue
- [ ] 3.3 Sync queue persistence in `localStorage[trip:<id>:syncQueue]`
- [ ] 3.4 Drain queue on reconnect (`window.online` event)
- [ ] 3.5 409 conflict handling: re-fetch, merge, drop queued
- [ ] 3.6 401 handling: clear token, emit "needs-auth" event
- [ ] 3.7 Tests: optimistic write, offline queue, conflict
- [ ] 3.8 Verification: integration test with mock fetch

## Phase 4: Adapter selection

- [ ] 4.1 Update `composables/useStorage.ts` to read `trip.sync` and select adapter
- [ ] 4.2 Add `composables/useSyncStatus.ts` exposing `'idle' | 'syncing' | 'pending' | 'offline' | 'error' | 'needs-auth'`
- [ ] 4.3 Verification: trips without `sync` use LocalAdapter (regression test)

## Phase 5: PIN gate UI

- [ ] 5.1 Create `components/PinGate.vue` — modal, 4–8 digit input, large numeric keypad on phone
- [ ] 5.2 Wire to `useSyncStatus` — opens automatically on `'needs-auth'`
- [ ] 5.3 "Skip — local only" link disables sync for this session/device
- [ ] 5.4 Wrong-PIN shake animation; throttle UI after 3 attempts
- [ ] 5.5 Verification: trip with `sync` prompts on first load; subsequent loads use stored token

## Phase 6: Sync indicator in top bar

- [ ] 6.1 Create `components/SyncIndicator.vue` — small icon + text, drives off `useSyncStatus`
- [ ] 6.2 States: ✓ Synced (green), ⟳ Syncing (spin), ⏱ Pending (amber), ✕ Offline (gray), ! Error (red)
- [ ] 6.3 Tap to expand: shows last sync time, retry button, "log out of this device"
- [ ] 6.4 Verification: indicator reflects real status during simulated network loss

## Phase 7: Settings UX additions

- [ ] 7.1 Add to settings menu: "Sync settings", "Log out of sync", "Rotate token"
- [ ] 7.2 "Log out" clears token, drops to LocalAdapter, keeps local cache
- [ ] 7.3 Verification: log out → write something → log back in → remote has the local-only changes? Decision: yes, queue them on re-auth

## Phase 8: Deploy

- [ ] 8.1 In Vercel: provision KV via `vercel kv create trip-sync`
- [ ] 8.2 Set env vars: `SYNC_PINS` (JSON map of bcrypted PINs), `JWT_SECRET` (random 32 bytes), `KV_*` (auto)
- [ ] 8.3 Deploy from `main`
- [ ] 8.4 Generate Málaga trip's PIN, bcrypt it, add to `SYNC_PINS`
- [ ] 8.5 Update Málaga trip JSON to include `sync.endpoint` pointing to the prod URL
- [ ] 8.6 Re-deploy with the updated trip
- [ ] 8.7 Phone verification: load on Dan's phone with PIN, then on Raluca's phone with same PIN, mark something on each, see it appear on the other within ~1s

## Phase 9: Documentation

- [ ] 9.1 Update README with sync setup instructions for future trips
- [ ] 9.2 Document the `vercel kv` provisioning steps
- [ ] 9.3 Add a runbook for "rotating a PIN" and "evicting a lost device"

## Out of scope (future changes)
- ❌ Multi-user identity (who did what)
- ❌ Real-time presence
- ❌ E2E encryption
- ❌ Magic-link or passwordless flows
- ❌ Account recovery
