/**
 * Proximity helpers — convert a place's `zone` into a glanceable
 * "minutes from home base" badge.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/ux-design/spec.md
 *   (Requirement: City proximity badge)
 *
 * Pure functions only — no Vue, no Nuxt. Tested in tests/utils/zones.test.ts.
 */
import type { Place, Zone } from '~/types/place'
import type { TripJson } from '~/utils/schema'

/** Day-trip zone — zone 4 places do not get a home-base label. */
const DAY_TRIP_ZONE = '4'

/** Map of normalized zone id → minutes label per the ux-design spec. */
const ZONE_TO_MINUTES: Record<string, string> = {
  1: '~5\'',
  2: '~15\'',
  3: '~30\'',
  4: '~1h',
}

/**
 * Returns the minutes-only proximity label for a zone, or the empty string
 * if the zone is not one of 1..4. Accepts both numeric and string ids since
 * `Zone` is `string | number` in the schema.
 */
export function zoneToMinutes(zone: Zone): string {
  return ZONE_TO_MINUTES[String(zone)] ?? ''
}

/**
 * Returns the full proximity label for a place, e.g. `~5' Málaga`,
 * `~15' Tarifa`, `~1h`. Returns empty string when the zone is unknown.
 *
 * - Zone 4 (day trip) → minutes-only, no home-base suffix.
 * - No `homeBase` on the place, or homeBase id not found → minutes-only.
 * - Otherwise → `<minutes> <homeBase.label>`.
 */
export function proximityLabel(place: Place, trip: TripJson): string {
  const minutes = zoneToMinutes(place.zone)
  if (!minutes) return ''
  if (String(place.zone) === DAY_TRIP_ZONE) return minutes
  if (!place.homeBase) return minutes
  const hb = trip.homeBases.find(h => h.id === place.homeBase)
  if (!hb) return minutes
  return `${minutes} ${hb.label}`
}
