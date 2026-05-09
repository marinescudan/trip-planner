/**
 * Picks the day that should be expanded by default on first render.
 *
 * Spec rules (`itinerary/spec.md`, "Default open day"):
 *   - in-range  → today's day
 *   - pre-trip  → day 1
 *   - post-trip → none (caller shows "Show full trip" banner)
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/itinerary/spec.md
 */
import type { Day, DayId } from '../types/day'
import type { ISODate } from '../types/trip'

export function pickDefaultOpenDay(
  today: ISODate,
  days: readonly Day[],
): DayId | null {
  if (days.length === 0) return null
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date))
  const first = sorted[0]!
  const last = sorted[sorted.length - 1]!
  if (today < first.date) return first.id
  if (today > last.date) return null
  return sorted.find(d => d.date === today)?.id ?? first.id
}
