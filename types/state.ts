/**
 * Place-state machine, day assignments, and presets.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/state/spec.md
 *   openspec/changes/init-trip-planner/specs/trip-schema/spec.md  (presets)
 */

import type { PlaceId, Slot } from './place'
import type { DayId } from './day'

/**
 * The five place states. `untouched` is the default and is NOT persisted
 * to the storage adapter (only non-`untouched` entries are stored).
 *
 * Allowed transitions:
 *   untouched  → wishlist | scheduled | skipped
 *   wishlist   → scheduled | skipped | untouched
 *   scheduled  → done | skipped | wishlist
 *   done       → untouched | skipped
 *   skipped    → untouched
 */
export type PlaceState = 'untouched' | 'wishlist' | 'scheduled' | 'done' | 'skipped'

/**
 * Per-trip slot assignments: `dayId → slotId → ordered placeId list`.
 *
 * Persisted under `trip:<tripId>:days` via the storage adapter.
 */
export type DayAssignments = Record<DayId, Record<Slot, PlaceId[]>>

/**
 * Optional initial state shipped with a trip JSON. Applied to user state
 * exactly once per trip id (tracked via `trip:<id>:presetsApplied`) so
 * later JSON re-fetches don't overwrite the user's edits.
 */
export interface Presets {
  states?: Record<PlaceId, PlaceState>
  scheduled?: DayAssignments
}
