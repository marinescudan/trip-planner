/**
 * Active trip access — reactive ref + indexed lookups for `placeById`
 * and `dayById`.
 *
 * Backed by a module-level `ref` so any component / composable that
 * imports `useTrip()` sees the same trip. v1 is client-rendered (Nuxt
 * SSR is effectively unused for trip-dependent screens, since the
 * loader requires `localStorage`), so module-level state is safe.
 */
import { computed, ref, type ComputedRef, type Ref } from 'vue'

import type { Day, DayId } from '../types/day'
import type { Place, PlaceId } from '../types/place'
import type { TripJson } from '../utils/schema'

const _activeTrip: Ref<TripJson | null> = ref(null)

export interface UseTrip {
  /** The active trip, or `null` while booting / on `/load`. */
  trip: ComputedRef<TripJson | null>
  /** `placeId → Place` lookup, recomputed when the active trip changes. */
  placeById: ComputedRef<Map<PlaceId, Place>>
  /** `dayId → Day` lookup, recomputed when the active trip changes. */
  dayById: ComputedRef<Map<DayId, Day>>
  setActiveTrip(trip: TripJson | null): void
}

export function useTrip(): UseTrip {
  const trip = computed(() => _activeTrip.value)

  const placeById = computed<Map<PlaceId, Place>>(() => {
    const m = new Map<PlaceId, Place>()
    if (!_activeTrip.value) return m
    for (const p of _activeTrip.value.places) m.set(p.id, p)
    return m
  })

  const dayById = computed<Map<DayId, Day>>(() => {
    const m = new Map<DayId, Day>()
    if (!_activeTrip.value) return m
    for (const d of _activeTrip.value.days) m.set(d.id, d)
    return m
  })

  function setActiveTrip(next: TripJson | null): void {
    _activeTrip.value = next
  }

  return { trip, placeById, dayById, setActiveTrip }
}
