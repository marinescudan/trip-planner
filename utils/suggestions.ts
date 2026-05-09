/**
 * Pure suggestion computation for `(dayId, slot)`.
 *
 * Filters source: a pre-filtered `candidatePlaces` list (from
 * `useFilters().filteredPlaces`). This util layers the slot-specific
 * rules from `itinerary/spec.md`:
 *
 *   - `validSlots` includes the slot
 *   - `validDays` allows this date (or is null/omitted)
 *   - place is not already scheduled in another slot of THIS day
 *
 * Sort: priority weight desc (higher weight first), then alpha by name.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/itinerary/spec.md
 */
import type { Day } from '../types/day'
import type { Place, Slot } from '../types/place'
import type { PriorityTierDef } from '../types/taxonomy'

export interface SuggestionInput {
  /** The day being rendered. */
  day: Day
  /** Target slot id. */
  slot: Slot
  /** Places that already pass the filter rail. */
  candidatePlaces: readonly Place[]
  /** Slot map for THIS day, e.g. `{ morning: ['mlg-x'], lunch: [...] }`. */
  todaysAssignments: Readonly<Record<Slot, readonly string[]>>
  /** Priority tier definitions, used for sort weight. */
  priorityTiers: readonly PriorityTierDef[]
}

/**
 * Returns suggestions sorted by priority weight desc, then alpha by name.
 * Caller controls slicing (top-5 vs "Show all (n)").
 */
export function computeSuggestions(input: SuggestionInput): Place[] {
  const { day, slot, candidatePlaces, todaysAssignments, priorityTiers } = input

  const scheduledToday = new Set<string>()
  for (const ids of Object.values(todaysAssignments)) {
    for (const id of ids) scheduledToday.add(id)
  }

  const weightById = new Map<string, number>()
  for (const t of priorityTiers) weightById.set(t.id, t.weight)

  return candidatePlaces
    .filter((p) => {
      if (!p.validSlots.includes(slot)) return false
      if (p.validDays != null && !p.validDays.includes(day.date)) return false
      if (scheduledToday.has(p.id)) return false
      return true
    })
    .slice() // copy before sort to avoid mutating caller's array
    .sort((a, b) => {
      const wa = weightById.get(a.priority) ?? 0
      const wb = weightById.get(b.priority) ?? 0
      if (wb !== wa) return wb - wa
      return a.name.localeCompare(b.name)
    })
}
