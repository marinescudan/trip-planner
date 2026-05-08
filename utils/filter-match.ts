/**
 * Pure filter-matching helpers. Kept out of the composable so they can be
 * unit-tested without Vue or storage.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/filters/spec.md
 */
import type { FilterState } from '../types/filters'
import type { Place } from '../types/place'

/** Lower-case + strip diacritics so "Málaga" matches "malaga". */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/**
 * Whether `place` passes the filter rail (excluding the "skipped" rule,
 * which depends on per-place state and is applied by the caller).
 */
export function matchesFilters(
  place: Place,
  filters: FilterState,
  normalizedSearch: string,
): boolean {
  if (!filters.priorityTiers.includes(place.priority)) return false
  if (!filters.zones.includes(place.zone)) return false
  if (!filters.costTiers.includes(place.cost)) return false

  if (filters.tags.length > 0) {
    if (filters.tagsAndMode) {
      for (const t of filters.tags) if (!place.tags.includes(t)) return false
    } else if (!filters.tags.some(t => place.tags.includes(t))) {
      return false
    }
  }

  if (normalizedSearch.length > 0) {
    const hay = normalize(`${place.name} ${place.area} ${place.tags.join(' ')}`)
    if (!hay.includes(normalizedSearch)) return false
  }

  return true
}
