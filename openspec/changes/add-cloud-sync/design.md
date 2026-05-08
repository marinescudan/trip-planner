# Design: Cloud Sync

## Architecture

```
Phone (Dan)              Vercel Edge                    Tablet (Raluca)
┌──────────┐         ┌────────────────┐                 ┌──────────┐
│  Nuxt    │◄──────►│ /api/sync/*    │◄───────────────►│  Nuxt    │
│  app     │  HTTPS  │ (serverless)   │  HTTPS          │  app     │
└────┬─────┘         └───────┬────────┘                 └────┬─────┘
     │                       │                               │
     │ writes/reads          │ KV ops                        │
     │ via CloudAdapter      ▼                               │
     │                ┌──────────────┐                       │
     └───────────────►│  Vercel KV   │◄──────────────────────┘
                      │   (Redis)    │
                      └──────────────┘
```

## CloudAdapter

```ts
class CloudAdapter implements StorageAdapter {
  constructor(
    private endpoint: string,    // from trip.sync.endpoint
    private tripId: string,      // from trip.sync.tripId
    private getToken: () => string | null
  ) {}

  async get<T>(key: string, schema: ZodSchema<T>): Promise<T | null> {
    // 1. Try cache (LocalAdapter under the hood)
    // 2. Fetch /api/sync/keys/<key>
    // 3. Validate via schema
    // 4. Update local cache
    // 5. Return
  }

  async set<T>(key: string, value: T, schema: ZodSchema<T>): Promise<void> {
    // 1. Write to local cache immediately (optimistic)
    // 2. Queue PUT to /api/sync/keys/<key>
    // 3. On 401 → re-prompt PIN
    // 4. On network error → queue for retry, mark "pending"
  }

  // ... etc
}
```

**Key insight**: `CloudAdapter` *wraps* `LocalAdapter` rather than replacing it. Local cache always written first; remote sync is best-effort, async, retried. App stays usable offline.

## Sync flow per write

```
User taps "wishlist"
  ↓
usePlaceState.setState() called
  ↓
useStorage().set('trip:<id>:states', map, schema)
  ↓
CloudAdapter.set()
  ├─ LocalAdapter.set() ✓ (immediate, UI updates)
  ├─ debounce 500ms, then:
  │    PUT /api/sync/keys/trip:<id>:states
  │       Authorization: Bearer <token>
  │       Body: { value: <map> }
  │       ↓
  │    200? → top-bar shows "synced ✓"
  │    401? → clear token, show PIN gate
  │    5xx? → queue retry, top-bar shows "pending…"
  │    offline? → queue retry, top-bar shows "offline"
```

## Server endpoints

```
POST /api/sync/auth
  Body: { tripId: string, pin: string }
  → 200 { token: string, expiresAt: ISODateTime }
  → 401 { error: "wrong PIN" }
  → 429 { error: "too many attempts" }

GET /api/sync/keys/:key
  Headers: Authorization: Bearer <token>
  → 200 { key, value, updatedAt }
  → 404 (key doesn't exist)
  → 401 (bad token)

PUT /api/sync/keys/:key
  Headers: Authorization: Bearer <token>
  Body: { value: any }
  → 200 { key, value, updatedAt }
  → 400 (schema validation failed server-side)
  → 401 (bad token)
  → 413 (payload > 1MB)

DELETE /api/sync/keys/:key
  Headers: Authorization: Bearer <token>
  → 204
  → 401

GET /api/sync/keys?prefix=<>
  Headers: Authorization: Bearer <token>
  → 200 { keys: string[] }
  → 401
```

All endpoints scope keys by extracted `tripId` from token. A token for trip A cannot read trip B's keys.

## Auth implementation

```ts
// /api/sync/auth.ts
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

const PINS = JSON.parse(process.env.SYNC_PINS!) // { "<tripId>": "<bcryptHash>" }
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export default async function handler(req) {
  const { tripId, pin } = await req.json()
  const hash = PINS[tripId]
  if (!hash) return new Response(null, { status: 401 })
  if (!await bcrypt.compare(pin, hash)) return new Response(null, { status: 401 })

  const token = await new SignJWT({ tripId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(SECRET)

  return Response.json({ token, expiresAt: /* +30d */ })
}
```

Rate limit: 5 PIN attempts per 5 min per IP via Vercel KV TTL counter.

## KV key layout

```
sync:<tripId>:trip:<tripId>:states         → JSON blob
sync:<tripId>:trip:<tripId>:days           → JSON blob
sync:<tripId>:trip:<tripId>:filters        → JSON blob
sync:<tripId>:trip:<tripId>:presetsApplied → boolean
```

The double `<tripId>` looks redundant but the outer one is the access-scope (server enforces from token) and the inner is the localStorage key (preserved verbatim so adapter swap is symmetric).

## Conflict resolution

**Last-write-wins per key.** Each value carries a server-assigned `updatedAt`. On read, app stores `updatedAt` alongside value. On write, app sends previous `updatedAt`; server rejects (409) if remote has been updated since.

UI handling on 409: app re-fetches the remote, shows a toast "Synced from another device", merges incoming changes into local state. No diff tool, no manual merge — the data is small and updates are coarse.

#### Pre-trip planning workload
Pre-trip writes are bursty (filtering, marking) but localized to one user at a time. Conflicts will be rare. During the trip, in-the-moment marks are even rarer to collide.

## Offline behavior

- Boot offline → CloudAdapter falls through to LocalAdapter cache
- Writes while offline → queued in `localStorage[trip:<id>:syncQueue]` as `[{key, value, ts}]`
- On reconnect → drain queue, oldest first, sequential PUTs
- If a queued PUT 409s → fetch remote, replace local, drop queued write (last-write-wins still applies)

## PIN gate UI

When CloudAdapter is selected and no token in storage:

- Modal blocks the UI
- Shows trip title + `trip.sync.label` (e.g. "Sync with Raluca's plan")
- Single 4-digit (or longer) PIN input, large numeric keypad on phone
- "Skip — local only" link disables sync for this device (writes only to LocalAdapter; can re-enable in settings)
- "Wrong PIN" → shake animation, disable for 1s after 3 attempts

## Why these choices

| Question | Answer |
|---|---|
| Why Vercel KV not Postgres? | KV is overkill-free for key-value; we have no relational queries |
| Why PIN not magic link? | No email needed, fewer steps, both partners can share the PIN verbally |
| Why bcrypt not plain? | Defense in depth; KV blob exposure shouldn't reveal PINs |
| Why 30-day token? | Long enough that re-auth is rare; short enough that lost devices auto-expire |
| Why no user identity? | Two-person trips don't need it; "who did this" isn't a question we have |
| Why server-side schema validation? | A malicious client can't corrupt remote state; another safety net |

## Open questions
- Do we want a "rotate PIN" admin action? Probably yes — a second env var update + force-clear all tokens. Spec'd as optional admin endpoint.
- Should `presetsApplied` actually sync? Yes — otherwise re-loading the trip on a new device re-applies presets and overwrites synced state. Critical bug to avoid.
