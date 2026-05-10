/**
 * Per-day "Group by slot" toggle.
 *
 * Persists `Record<DayId, boolean>` (true = grouped, missing/false = flat)
 * under `trip:<id>:dayViewMode`. The default is flat — each day renders as
 * a single chronological list of scheduled places. Turning this on for a
 * day restores the legacy slot-grouped layout for that day only.
 *
 * Mirrors the `useFilters` shape: module-level state, explicit
 * `loadForTrip(tripId)` / `unload()`, throttled persistence per CLAUDE.md.
 *
 * Source of truth: per-day toggle described in the flat-list change plan;
 *   spec edits queued for the next versioning pass.
 */
import { computed, readonly, ref, type ComputedRef, type DeepReadonly, type Ref } from 'vue'
import { z } from 'zod'

import type { DayId } from '../types/day'

import { throttledWrite, tripKey, useStorage } from './useStorage'

const dayViewModeSchema: z.ZodType<Record<DayId, boolean>> = z.record(
  z.string(),
  z.boolean(),
)

const _modeByDay: Ref<Record<DayId, boolean>> = ref({})
let _currentTripId: string | null = null

export interface UseDayViewMode {
  /** Reactive snapshot. Missing keys mean "flat". */
  modes: DeepReadonly<Ref<Record<DayId, boolean>>>
  currentTripId: ComputedRef<string | null>

  /** `true` when the day is in grouped (legacy slot rows) mode. Defaults to `false`. */
  isGrouped(dayId: DayId): boolean
  /** Persists immediately (subject to per-key throttling). */
  setGrouped(dayId: DayId, on: boolean): void
  /** Convenience: flip the current value. */
  toggle(dayId: DayId): void

  loadForTrip(tripId: string): Promise<void>
  unload(): void
}

export function useDayViewMode(): UseDayViewMode {
  return {
    modes: readonly(_modeByDay),
    currentTripId: computed(() => _currentTripId),
    isGrouped,
    setGrouped,
    toggle,
    loadForTrip,
    unload,
  }
}

function isGrouped(dayId: DayId): boolean {
  return _modeByDay.value[dayId] === true
}

function setGrouped(dayId: DayId, on: boolean): void {
  const next = { ..._modeByDay.value }
  if (on) next[dayId] = true
  else delete next[dayId]
  _modeByDay.value = next
  persist()
}

function toggle(dayId: DayId): void {
  setGrouped(dayId, !isGrouped(dayId))
}

async function loadForTrip(tripId: string): Promise<void> {
  _currentTripId = tripId
  const stored = await useStorage().get(tripKey(tripId, 'dayViewMode'), dayViewModeSchema)
  _modeByDay.value = stored ?? {}
}

function unload(): void {
  _currentTripId = null
  _modeByDay.value = {}
}

function persist(): void {
  if (_currentTripId == null) return
  throttledWrite(tripKey(_currentTripId, 'dayViewMode'), _modeByDay.value, dayViewModeSchema)
}
