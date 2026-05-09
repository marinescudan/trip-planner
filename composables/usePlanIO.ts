/**
 * Plan import/export + reset for the active trip.
 *
 * Plan = the user's edits on top of an immutable trip JSON: place states,
 * day assignments, and filter UI state. The trip itself is not part of the
 * plan — sharing a plan only makes sense between two devices already
 * loaded with the same `trip.id`.
 *
 * Spec scenarios:
 *   - "Round-trip export/import": Dan exports JSON, Raluca imports → her
 *     localStorage matches Dan's, the rendered itinerary is identical.
 *   - "Reset all state": typed "RESET" confirmation, clears all three
 *     per-trip keys.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/state/spec.md
 */
import { z } from 'zod'

import type { FilterState } from '../types/filters'
import type { DayAssignments, PlaceState } from '../types/state'

import { useDayPlan } from './useDayPlan'
import { useFilters } from './useFilters'
import { usePlaceState } from './usePlaceState'
import { flushThrottledWrites, tripKey, useStorage } from './useStorage'
import { useTrip } from './useTrip'

export const PLAN_FILE_VERSION = 1

const placeStateSchema = z.enum([
  'untouched',
  'wishlist',
  'scheduled',
  'done',
  'skipped',
])
const placeStatesSchema = z.record(z.string(), placeStateSchema)
const dayAssignmentsSchema: z.ZodType<DayAssignments> = z.record(
  z.string(),
  z.record(z.string(), z.array(z.string())),
)
const filterStateSchema: z.ZodType<FilterState> = z.object({
  priorityTiers: z.array(z.string()),
  zones: z.array(z.union([z.string(), z.number()])),
  costTiers: z.array(z.string()),
  tags: z.array(z.string()),
  tagsAndMode: z.boolean(),
  search: z.string(),
  showHidden: z.boolean(),
})

const planFileSchema = z.object({
  version: z.literal(PLAN_FILE_VERSION),
  tripId: z.string().min(1),
  exportedAt: z.string(),
  states: placeStatesSchema,
  days: dayAssignmentsSchema,
  filters: filterStateSchema,
})
export type PlanFile = z.infer<typeof planFileSchema>

export interface UsePlanIO {
  /** Build a `PlanFile` from current adapter contents for the active trip. */
  buildExport(): Promise<PlanFile | null>
  /** Triggers a `<a download>` of the plan JSON. Browser-only. */
  downloadExport(): Promise<void>
  /** Parse + validate raw text from a user file; returns issues on failure. */
  parsePlan(raw: string): { ok: true, plan: PlanFile } | { ok: false, error: string }
  /**
   * Apply a parsed plan to the active trip. Mismatched `tripId` is a hard
   * error — refuse to merge plans across trips. Reloads composables in place.
   */
  importPlan(plan: PlanFile): Promise<{ ok: true } | { ok: false, error: string }>
  /**
   * Wipe all three per-trip keys + reload composables. Caller is
   * responsible for the typed-confirmation UX (spec "Reset confirmation").
   */
  resetAllState(): Promise<void>
}

export function usePlanIO(): UsePlanIO {
  return {
    buildExport,
    downloadExport,
    parsePlan,
    importPlan,
    resetAllState,
  }
}

async function buildExport(): Promise<PlanFile | null> {
  const tripId = useTrip().trip.value?.trip.id
  if (!tripId) return null
  // Make sure any pending throttled writes hit storage before we read it.
  await flushThrottledWrites()
  const adapter = useStorage()
  const states = (await adapter.get(tripKey(tripId, 'states'), placeStatesSchema)) ?? {}
  const days = (await adapter.get(tripKey(tripId, 'days'), dayAssignmentsSchema)) ?? {}
  const filters = (await adapter.get(tripKey(tripId, 'filters'), filterStateSchema))
    ?? defaultFiltersFromMemory()
  return {
    version: PLAN_FILE_VERSION,
    tripId,
    exportedAt: new Date().toISOString(),
    states: states as Record<string, PlaceState>,
    days,
    filters,
  }
}

async function downloadExport(): Promise<void> {
  if (typeof window === 'undefined') return
  const plan = await buildExport()
  if (!plan) return
  const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `trip-plan-${plan.tripId}-${plan.exportedAt.slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function parsePlan(raw: string): { ok: true, plan: PlanFile } | { ok: false, error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'Not valid JSON.' }
  }
  const r = planFileSchema.safeParse(parsed)
  if (!r.success) {
    const first = r.error.issues[0]
    const path = first?.path.join('.') ?? ''
    return { ok: false, error: `Plan file is malformed${path ? ` (${path})` : ''}.` }
  }
  return { ok: true, plan: r.data }
}

async function importPlan(plan: PlanFile): Promise<{ ok: true } | { ok: false, error: string }> {
  const tripId = useTrip().trip.value?.trip.id
  if (!tripId) return { ok: false, error: 'No active trip.' }
  if (plan.tripId !== tripId) {
    return {
      ok: false,
      error: `This plan is for trip "${plan.tripId}". Active trip is "${tripId}".`,
    }
  }
  // Cancel any pending writes — we're about to overwrite the same keys.
  await flushThrottledWrites()
  const adapter = useStorage()
  await adapter.set(tripKey(tripId, 'states'), plan.states, placeStatesSchema)
  await adapter.set(tripKey(tripId, 'days'), plan.days, dayAssignmentsSchema)
  await adapter.set(tripKey(tripId, 'filters'), plan.filters, filterStateSchema)
  // Re-hydrate in-memory composables from the freshly-written keys.
  await usePlaceState().loadForTrip(tripId)
  await useDayPlan().loadForTrip(tripId)
  await useFilters().loadForTrip(tripId)
  return { ok: true }
}

async function resetAllState(): Promise<void> {
  const tripId = useTrip().trip.value?.trip.id
  if (!tripId) return
  await flushThrottledWrites()
  const adapter = useStorage()
  await adapter.delete(tripKey(tripId, 'states'))
  await adapter.delete(tripKey(tripId, 'days'))
  await adapter.delete(tripKey(tripId, 'filters'))
  await adapter.delete(tripKey(tripId, 'presetsApplied'))
  await usePlaceState().loadForTrip(tripId)
  await useDayPlan().loadForTrip(tripId)
  await useFilters().loadForTrip(tripId)
}

/** Fallback when a trip has not yet persisted any filter state. */
function defaultFiltersFromMemory(): FilterState {
  return useFilters().filters.value as FilterState
}
