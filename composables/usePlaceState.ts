/**
 * Per-trip place-state composable.
 *
 * Persists a `Record<PlaceId, PlaceState>` under `trip:<id>:states`. Only
 * non-`untouched` entries are stored; transitioning back to `untouched`
 * deletes the entry entirely (per spec: "Untouched states are not stored").
 *
 * State transitions are documented in `types/state.ts`. The cycle button
 * advances `untouched → wishlist → scheduled → done → untouched`; the
 * "Skip" action is a separate explicit transition handled by `skip()`.
 *
 * Hydration is explicit: callers (the trip loader, tests) call
 * `loadForTrip(tripId)`. The composable does NOT auto-watch the active
 * trip — keeps the boot sequence deterministic and the tests synchronous.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/state/spec.md
 */
import { computed, readonly, ref, type ComputedRef, type DeepReadonly, type Ref } from 'vue'
import { z } from 'zod'

import type { PlaceId } from '../types/place'
import type { PlaceState } from '../types/state'

import { throttledWrite, tripKey, useStorage } from './useStorage'
import { useTrip } from './useTrip'

const placeStateSchema = z.enum([
  'untouched',
  'wishlist',
  'scheduled',
  'done',
  'skipped',
])
const placeStatesSchema = z.record(z.string(), placeStateSchema)

/** Cycle order used by the state button. `skipped` is excluded — see `skip()`. */
const CYCLE: PlaceState[] = ['untouched', 'wishlist', 'scheduled', 'done']

const _states: Ref<Record<PlaceId, PlaceState>> = ref({})
let _currentTripId: string | null = null

export interface UsePlaceState {
  /** Reactive snapshot. Only non-`untouched` entries are present. */
  states: DeepReadonly<Ref<Record<PlaceId, PlaceState>>>
  /** Trip id the in-memory state was hydrated for, or `null`. */
  currentTripId: ComputedRef<string | null>

  /** Returns `'untouched'` if no entry stored. */
  getState(placeId: PlaceId): PlaceState
  /** Persists immediately (subject to per-key throttling). */
  setState(placeId: PlaceId, next: PlaceState): void
  /** Advances on the cycle ring (`untouched → wishlist → scheduled → done → untouched`). */
  cycleState(placeId: PlaceId): void
  /** Explicit skip — separate from the cycle. */
  skip(placeId: PlaceId): void

  /** Hydrate from `trip:<tripId>:states`, dropping placeIds not in the active trip. */
  loadForTrip(tripId: string): Promise<void>
  /** Drop in-memory state. Does NOT touch storage. Used when no trip is active. */
  unload(): void
}

export function usePlaceState(): UsePlaceState {
  return {
    states: readonly(_states),
    currentTripId: computed(() => _currentTripId),
    getState,
    setState,
    cycleState,
    skip,
    loadForTrip,
    unload,
  }
}

function getState(placeId: PlaceId): PlaceState {
  return _states.value[placeId] ?? 'untouched'
}

function setState(placeId: PlaceId, next: PlaceState): void {
  // Spec "Untouched states are not stored" — drop the entry entirely.
  const merged: Record<PlaceId, PlaceState> = { ..._states.value }
  if (next === 'untouched') {
    delete merged[placeId]
  } else {
    merged[placeId] = next
  }
  _states.value = merged
  persist()
}

function cycleState(placeId: PlaceId): void {
  const cur = getState(placeId)
  // If currently `skipped`, the cycle button restores to `untouched` per spec
  // ("skipped → untouched"). Otherwise advance on the ring.
  if (cur === 'skipped') {
    setState(placeId, 'untouched')
    return
  }
  const idx = CYCLE.indexOf(cur)
  const next = CYCLE[(idx + 1) % CYCLE.length]!
  setState(placeId, next)
}

function skip(placeId: PlaceId): void {
  setState(placeId, 'skipped')
}

async function loadForTrip(tripId: string): Promise<void> {
  _currentTripId = tripId
  const stored = await useStorage().get(tripKey(tripId, 'states'), placeStatesSchema)
  // Prune ids not in the active trip (handles renamed / removed places).
  const known = new Set(useTrip().placeById.value.keys())
  const cleaned: Record<PlaceId, PlaceState> = {}
  for (const [pid, st] of Object.entries(stored ?? {})) {
    if (known.has(pid)) cleaned[pid] = st
  }
  _states.value = cleaned
}

function unload(): void {
  _currentTripId = null
  _states.value = {}
}

function persist(): void {
  if (_currentTripId == null) return
  throttledWrite(tripKey(_currentTripId, 'states'), _states.value, placeStatesSchema)
}
