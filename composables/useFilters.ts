/**
 * Per-trip filter UI state + computed `filteredPlaces`.
 *
 * Defaults are taxonomy-driven ("all selected" for priority/zone/cost,
 * empty for tags, search empty, hidden off). Filtered places exclude
 * `skipped` unless `showHidden` is on.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/filters/spec.md
 */
import { computed, readonly, ref, type ComputedRef, type DeepReadonly, type Ref } from 'vue'
import { z } from 'zod'

import type { FilterState } from '../types/filters'
import type { Place } from '../types/place'
import type { TripJson } from '../utils/schema'
import { matchesFilters, normalize } from '../utils/filter-match'

import { usePlaceState } from './usePlaceState'
import { throttledWrite, tripKey, useStorage } from './useStorage'
import { useTrip } from './useTrip'

const filterStateSchema: z.ZodType<FilterState> = z.object({
  priorityTiers: z.array(z.string()),
  zones: z.array(z.union([z.string(), z.number()])),
  costTiers: z.array(z.string()),
  tags: z.array(z.string()),
  tagsAndMode: z.boolean(),
  search: z.string(),
  showHidden: z.boolean(),
})

const _filters: Ref<FilterState> = ref(emptyDefaults())
let _currentTripId: string | null = null

export interface UseFilters {
  filters: DeepReadonly<Ref<FilterState>>
  /** Places passing the rail (and hidden rule). Recomputes on filter/state/trip change. */
  filteredPlaces: ComputedRef<Place[]>
  /** "matching / total" counts as `[matching, total]`. */
  counts: ComputedRef<readonly [number, number]>
  currentTripId: ComputedRef<string | null>

  setPriorityTiers(ids: FilterState['priorityTiers']): void
  setZones(ids: FilterState['zones']): void
  setCostTiers(ids: FilterState['costTiers']): void
  setTags(ids: string[]): void
  setTagsAndMode(on: boolean): void
  setSearch(text: string): void
  setShowHidden(on: boolean): void
  /** Restore taxonomy-driven defaults. Does NOT touch place state. */
  reset(): void

  loadForTrip(tripId: string): Promise<void>
  unload(): void
}

export function useFilters(): UseFilters {
  const filteredPlaces = computed<Place[]>(() => {
    const trip = useTrip().trip.value
    if (!trip) return []
    const ps = usePlaceState()
    const search = normalize(_filters.value.search.trim())
    return trip.places.filter(p => {
      const state = ps.getState(p.id)
      if (state === 'skipped' && !_filters.value.showHidden) return false
      return matchesFilters(p, _filters.value, search)
    })
  })

  const counts = computed<readonly [number, number]>(() => {
    const trip = useTrip().trip.value
    return [filteredPlaces.value.length, trip?.places.length ?? 0] as const
  })

  return {
    filters: readonly(_filters),
    filteredPlaces,
    counts,
    currentTripId: computed(() => _currentTripId),
    setPriorityTiers: ids => mutate({ priorityTiers: ids }),
    setZones: ids => mutate({ zones: ids }),
    setCostTiers: ids => mutate({ costTiers: ids }),
    setTags: ids => mutate({ tags: ids }),
    setTagsAndMode: on => mutate({ tagsAndMode: on }),
    setSearch: text => mutate({ search: text }),
    setShowHidden: on => mutate({ showHidden: on }),
    reset: () => {
      const trip = useTrip().trip.value
      _filters.value = trip ? defaultsForTrip(trip) : emptyDefaults()
      persist()
    },
    loadForTrip,
    unload,
  }
}

function mutate(patch: Partial<FilterState>): void {
  _filters.value = { ..._filters.value, ...patch }
  persist()
}

async function loadForTrip(tripId: string): Promise<void> {
  _currentTripId = tripId
  const trip = useTrip().trip.value
  const stored = await useStorage().get(tripKey(tripId, 'filters'), filterStateSchema)
  _filters.value = stored ?? (trip ? defaultsForTrip(trip) : emptyDefaults())
}

function unload(): void {
  _currentTripId = null
  _filters.value = emptyDefaults()
}

function persist(): void {
  if (_currentTripId == null) return
  throttledWrite(tripKey(_currentTripId, 'filters'), _filters.value, filterStateSchema)
}

function emptyDefaults(): FilterState {
  return {
    priorityTiers: [],
    zones: [],
    costTiers: [],
    tags: [],
    tagsAndMode: false,
    search: '',
    showHidden: false,
  }
}

/** "All selected" defaults populated from `trip.taxonomy`. */
export function defaultsForTrip(trip: TripJson): FilterState {
  return {
    priorityTiers: trip.taxonomy.priorityTiers.map(p => p.id),
    zones: trip.taxonomy.zones.map(z => z.id),
    costTiers: trip.taxonomy.costTiers.map(c => c.id),
    tags: [],
    tagsAndMode: false,
    search: '',
    showHidden: false,
  }
}
