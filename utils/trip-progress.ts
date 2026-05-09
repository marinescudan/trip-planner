/**
 * "Day n of N" computation for the top app bar.
 *
 * All comparisons are done on ISO date strings (YYYY-MM-DD) so they're
 * timezone-stable; this matches `enumerateDays()` in `utils/schema.ts`.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/ui-shell/spec.md
 */
import type { ISODate } from '../types/trip'

export type TripPhase = 'pre' | 'during' | 'post'

export interface TripProgress {
  phase: TripPhase
  /** Day number (1..total) when phase==='during'; null otherwise. */
  dayNumber: number | null
  /** Total days in the trip (inclusive). */
  total: number
  /** Pre-rendered label for the top bar ("Day 4 of 12" / "Pre-trip" / "Trip ended"). */
  label: string
}

/** Today as YYYY-MM-DD in the user's local timezone. */
export function todayISO(now: Date = new Date()): ISODate {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Total days inclusive between two ISO dates. */
export function daysInclusive(start: ISODate, end: ISODate): number {
  const s = Date.UTC(
    Number(start.slice(0, 4)),
    Number(start.slice(5, 7)) - 1,
    Number(start.slice(8, 10)),
  )
  const e = Date.UTC(
    Number(end.slice(0, 4)),
    Number(end.slice(5, 7)) - 1,
    Number(end.slice(8, 10)),
  )
  return Math.round((e - s) / 86_400_000) + 1
}

export function tripProgress(
  today: ISODate,
  startDate: ISODate,
  endDate: ISODate,
): TripProgress {
  const total = daysInclusive(startDate, endDate)
  if (today < startDate) {
    return { phase: 'pre', dayNumber: null, total, label: 'Pre-trip' }
  }
  if (today > endDate) {
    return { phase: 'post', dayNumber: null, total, label: 'Trip ended' }
  }
  const dayNumber = daysInclusive(startDate, today)
  return {
    phase: 'during',
    dayNumber,
    total,
    label: `Day ${dayNumber} of ${total}`,
  }
}
