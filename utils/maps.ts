/**
 * Google Maps URL builders.
 *
 *   buildPlaceMapsUrl  — single-place "Maps" link. Hidden for logistics
 *                        and for places without `mapsUrl` (returns `null`).
 *   buildDayRouteUrl   — directions across a day's scheduled places, in
 *                        slot order. Caps at 9 stops per Google's URL
 *                        limit and appends `travelmode=` for walking /
 *                        driving / transit (omitted for `mixed` since
 *                        Google has no equivalent mode).
 *
 * Pure functions. Tested in `tests/utils/maps.test.ts`.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/map/spec.md
 */
import type { TravelMode } from '../types/day'
import type { Place } from '../types/place'

/** Google's directions URL caps at 9 waypoints. */
export const MAX_DAY_ROUTE_STOPS = 9

/**
 * Single-place Maps link.
 *
 * Returns `null` (button must be hidden) when:
 *   - the place is `type: 'logistics'`, or
 *   - `mapsUrl` is empty / missing.
 */
export function buildPlaceMapsUrl(place: Place): string | null {
  if (place.type === 'logistics') return null
  const url = place.mapsUrl?.trim()
  if (!url) return null
  return url
}

export interface DayRouteBuild {
  /** Final URL, or `null` if no usable stops. */
  url: string | null
  /** Total scheduled stops considered (after coord filtering). */
  total: number
  /** Stops actually encoded in the URL (capped at MAX_DAY_ROUTE_STOPS). */
  used: number
  /** True when `total > MAX_DAY_ROUTE_STOPS` and the URL was truncated. */
  truncated: boolean
}

/**
 * Build a directions URL for a day's scheduled places, in the order given.
 *
 * Spec scenarios:
 *   - Single stop                → `…/maps/?q=lat,lng`        (place, not directions)
 *   - 2..MAX_DAY_ROUTE_STOPS     → `…/maps/dir/{lat,lng}/{lat,lng}/…`
 *   - More than MAX_DAY_ROUTE_STOPS → first 9 only, `truncated: true`
 *   - 0 usable stops             → `url: null`
 *
 * Places with sentinel `[0, 0]` coords (logistics with no real location)
 * are skipped before the cap is applied.
 */
export function buildDayRouteUrl(
  places: readonly Place[],
  travelMode: TravelMode,
): DayRouteBuild {
  const usable = places.filter(p => hasUsableCoords(p))
  const total = usable.length
  if (total === 0) {
    return { url: null, total: 0, used: 0, truncated: false }
  }

  const truncated = total > MAX_DAY_ROUTE_STOPS
  const stops = truncated ? usable.slice(0, MAX_DAY_ROUTE_STOPS) : usable
  const used = stops.length

  const tmParam = travelModeParam(travelMode)

  if (used === 1) {
    const [lat, lng] = stops[0]!.coords
    // Single-place form already uses `?q=...` so chain with `&`.
    const tail = tmParam ? `&travelmode=${tmParam}` : ''
    return {
      url: `https://www.google.com/maps/?q=${lat},${lng}${tail}`,
      total,
      used,
      truncated,
    }
  }

  const segments = stops.map(p => `${p.coords[0]},${p.coords[1]}`).join('/')
  const tail = tmParam ? `?travelmode=${tmParam}` : ''
  return {
    url: `https://www.google.com/maps/dir/${segments}${tail}`,
    total,
    used,
    truncated,
  }
}

// --- helpers ---------------------------------------------------------------

function hasUsableCoords(place: Place): boolean {
  const [lat, lng] = place.coords
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  // Reject the [0,0] sentinel often used for "no real location".
  if (lat === 0 && lng === 0) return false
  return true
}

/** Map our `TravelMode` to Google's `travelmode` URL param. */
function travelModeParam(mode: TravelMode): string | null {
  switch (mode) {
    case 'walking':
    case 'driving':
    case 'transit':
      return mode
    case 'mixed':
      // Google has no equivalent — omit the param so user can pick.
      return null
  }
}
