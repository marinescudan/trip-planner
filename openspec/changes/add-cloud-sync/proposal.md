# Proposal: Add Cloud Sync (PIN-protected)

## Why
v1 persists state in `localStorage`, which is per-device. Two travelers (Dan + Raluca) on two phones see different states; switching between phone and desktop loses progress. The friction is acute during active planning.

A small backend that mirrors the `trip:<id>:*` keys to a shared remote store, gated by a per-trip PIN, gives both travelers the same view on any device with **zero account creation, zero OAuth, zero email verification.**

## What Changes

### App
- A new `CloudAdapter` implementing the `StorageAdapter` interface introduced in `init-trip-planner`
- A "PIN gate" UI on first sync attempt: enter PIN, app stores token in localStorage, all reads/writes flow through `/api/sync/*`
- A small "synced ✓ / pending… / offline" indicator in the top bar
- Optimistic local writes with background sync; conflict resolution = last-write-wins per key (acceptable since updates are coarse, e.g. a whole place state map)
- Offline mode: `LocalAdapter` continues to work; sync resumes when connectivity returns

### Trip JSON v1.1 (additive, backward-compatible)
A new optional top-level field:

```jsonc
"sync": {
  "endpoint": "https://my-trip.vercel.app/api/sync",
  "tripId":   "malaga-tarifa-2026",
  "label":    "Sync with Raluca's plan"
}
```

If absent, app uses LocalAdapter only (current v1 behavior). If present, app prompts for PIN on first load and uses CloudAdapter.

### Backend (Vercel serverless functions)
- `POST /api/sync/auth` — exchanges PIN for a session token
- `GET  /api/sync/keys?prefix=<>` — list keys
- `GET  /api/sync/keys/:key` — read one key
- `PUT  /api/sync/keys/:key` — write one key (idempotent, schema-validated server-side)
- `DELETE /api/sync/keys/:key` — delete one key

Storage: **Vercel KV (Redis)** under the hood. Free tier: 30k commands/month, 256MB. Plenty.

### Auth model
- Single PIN per trip (set as Vercel env var `SYNC_PIN_<TRIP_ID>`)
- Or: `SYNC_PINS` env var as JSON map `{ "<tripId>": "<bcrypt-hash>" }`
- Token = signed JWT with `tripId + exp`, 30-day expiry, stored in `localStorage[trip:<id>:syncToken]`
- No user accounts, no email, no recovery — if PIN lost, set new env var

## Impact
- **New code paths**: `CloudAdapter`, `/api/sync/*` routes, PIN gate UI, sync indicator
- **Affected users**: anyone whose trip JSON includes a `sync` block; trips without it work exactly as before
- **Backward compat**: Trip JSON v1.0 (no `sync` field) continues to load on the v1.1+ app
- **Cost**: Vercel KV free tier (€0 for our scale)
- **Privacy**: PIN is the only secret; data is encrypted at rest by KV; no tracking
- **Limitation**: PIN is *shared* between all travelers on a trip. Adequate for couples/small groups; not a full multi-user system

## Non-goals
- ❌ Per-user identity / "who marked this scheduled?"
- ❌ Real-time presence indicators (no WebSockets)
- ❌ Conflict resolution beyond last-write-wins
- ❌ End-to-end encryption (the server can read state — acceptable for travel data)
- ❌ Account recovery / password reset
- ❌ Public sharing of plans (separate future change)
