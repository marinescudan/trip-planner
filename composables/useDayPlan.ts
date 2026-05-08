/**
 * Per-trip day/slot assignments composable.
 *
 * Persists `DayAssignments` (dayId → slotId → ordered placeId[]) under
 * `trip:<id>:days`. Assigning a place to a slot:
 *   1. removes it from any other slot of the SAME day (spec scenario
 *      "Wishlist → scheduled");
 *   2. transitions its place state to `scheduled` unless already `done`
 *      (spec requirement "Auto-schedule on slot drop").
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/state/spec.md
 *   openspec/changes/init-trip-planner/specs/itinerary/spec.md
 */
import { computed, readonly, ref, type ComputedRef, type DeepReadonly, type Ref } from 'vue'
import { z } from 'zod'

import type { DayId } from '../types/day'
import type { PlaceId, Slot } from '../types/place'
import type { DayAssignments } from '../types/state'

import { usePlaceState } from './usePlaceState'
import { throttledWrite, tripKey, useStorage } from './useStorage'

const dayAssignmentsSchema: z.ZodType<DayAssignments> = z.record(
  z.string(),
  z.record(z.string(), z.array(z.string())),
)

const _assignments: Ref<DayAssignments> = ref({})
let _currentTripId: string | null = null

export interface UseDayPlan {
  assignments: DeepReadonly<Ref<DayAssignments>>
  currentTripId: ComputedRef<string | null>

  /** Ordered placeIds in `(dayId, slot)`, or `[]`. */
  getSlot(dayId: DayId, slot: Slot): PlaceId[]
  /** Append `placeId` to `(dayId, slot)`; remove from other slots of same day; auto-schedule. */
  assignToSlot(dayId: DayId, slot: Slot, placeId: PlaceId): void
  /** Remove `placeId` from `(dayId, slot)`. Slot/day are pruned when empty. */
  removeFromSlot(dayId: DayId, slot: Slot, placeId: PlaceId): void

  loadForTrip(tripId: string): Promise<void>
  unload(): void
}

export function useDayPlan(): UseDayPlan {
  return {
    assignments: readonly(_assignments),
    currentTripId: computed(() => _currentTripId),
    getSlot,
    assignToSlot,
    removeFromSlot,
    loadForTrip,
    unload,
  }
}

function getSlot(dayId: DayId, slot: Slot): PlaceId[] {
  return _assignments.value[dayId]?.[slot] ?? []
}

function assignToSlot(dayId: DayId, slot: Slot, placeId: PlaceId): void {
  const next = cloneAssignments(_assignments.value)
  const day: Record<Slot, PlaceId[]> = next[dayId] ?? {}
  // Remove from any other slot of THIS day. Same-day uniqueness only —
  // a place may still be scheduled across multiple days.
  for (const s of Object.keys(day)) {
    day[s] = day[s]!.filter(p => p !== placeId)
    if (day[s]!.length === 0) delete day[s]
  }
  // Append (don't dedupe within slot — caller controls order; reassigning
  // an already-present id moves it to the end).
  day[slot] = [...(day[slot] ?? []).filter(p => p !== placeId), placeId]
  next[dayId] = day
  _assignments.value = next

  // Auto-schedule unless already done (spec: "Done remains done").
  const ps = usePlaceState()
  if (ps.getState(placeId) !== 'done') ps.setState(placeId, 'scheduled')

  persist()
}

function removeFromSlot(dayId: DayId, slot: Slot, placeId: PlaceId): void {
  const day = _assignments.value[dayId]
  if (!day || !day[slot]) return
  const next = cloneAssignments(_assignments.value)
  const slots = next[dayId]!
  slots[slot] = slots[slot]!.filter(p => p !== placeId)
  if (slots[slot]!.length === 0) delete slots[slot]
  if (Object.keys(slots).length === 0) delete next[dayId]
  _assignments.value = next
  persist()
}

async function loadForTrip(tripId: string): Promise<void> {
  _currentTripId = tripId
  const stored = await useStorage().get(tripKey(tripId, 'days'), dayAssignmentsSchema)
  _assignments.value = stored ?? {}
}

function unload(): void {
  _currentTripId = null
  _assignments.value = {}
}

function persist(): void {
  if (_currentTripId == null) return
  throttledWrite(tripKey(_currentTripId, 'days'), _assignments.value, dayAssignmentsSchema)
}

function cloneAssignments(src: DayAssignments): DayAssignments {
  const out: DayAssignments = {}
  for (const [d, slots] of Object.entries(src)) {
    const cloned: Record<Slot, PlaceId[]> = {}
    for (const [s, ids] of Object.entries(slots)) cloned[s] = [...ids]
    out[d] = cloned
  }
  return out
}
