/**
 * Trip locker entry — what `localStorage[trip:locker]` stores.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/trip-loading/spec.md
 */

/** ISO 8601 datetime, e.g. `'2026-05-09T14:32:01.123Z'`. */
export type ISODateTime = string

export type LockerSource = 'default' | 'url' | 'upload' | 'paste'

export interface LockerEntry {
  /** `trip.id` from the validated trip JSON. */
  id: string
  /** `trip.title` — used in the trip switcher. */
  title: string
  source: LockerSource
  /** Present when `source === 'url'` (or the default `/trip.json` shipped with the build). */
  sourceUrl?: string
  /** Raw JSON text — kept verbatim so we can reload offline and re-validate without a network round-trip. */
  sourceJson: string
  loadedAt: ISODateTime
}
