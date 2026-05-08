/**
 * Verification: task 4.6 — switching active trip preserves each trip's
 * place state, day plan, and filters independently. Drives this through
 * the actual `useTripLoader` to exercise the full hook-up.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useDayPlan } from '../../composables/useDayPlan'
import { useFilters } from '../../composables/useFilters'
import { usePlaceState } from '../../composables/usePlaceState'
import {
  flushThrottledWrites,
  InMemoryAdapter,
  setStorageAdapter,
} from '../../composables/useStorage'
import { useTrip } from '../../composables/useTrip'
import { useTripLocker } from '../../composables/useTripLocker'
import { type LoaderEnv, type MinimalResponse, useTripLoader } from '../../composables/useTripLoader'
import type { TripJson } from '../../utils/schema'

function tripFor(id: string): TripJson {
  return {
    $schema: 'trip-app/v1.0.0',
    trip: {
      id,
      title: id,
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      timezone: 'Europe/Madrid',
      currency: 'EUR',
      language: 'en',
      travelers: [{ id: 't', name: 'T' }],
    },
    homeBases: [
      {
        id: 'hb',
        label: 'hb',
        city: 'c',
        coords: [40, -3],
        dateRange: { from: '2026-01-01', to: '2026-01-02' },
      },
    ],
    taxonomy: {
      slots: [{ id: 'morning', label: 'm', order: 1 }],
      priorityTiers: [{ id: 'must', label: 'M', color: '#ef4444', weight: 4 }],
      costTiers: [{ id: 'free', label: 'Free', symbol: 'Free', max: 0 }],
      zones: [{ id: 1, label: 'Z1' }],
      energy: [{ id: 'light', label: 'L' }],
    },
    places: [
      {
        id: `${id}-p1`,
        name: 'P1',
        type: 'monument',
        area: 'a',
        coords: [40, -3],
        photos: [{ src: 'https://example.com/x.jpg', alt: 'x' }],
        description: '',
        priority: 'must',
        zone: 1,
        cost: 'free',
        duration: 60,
        validSlots: ['morning'],
        tags: [],
        energy: 'light',
        bookingRequired: false,
      },
    ],
    days: [
      { id: 'd1', date: '2026-01-01', dayNum: 1, theme: '', travelMode: 'walking' },
      { id: 'd2', date: '2026-01-02', dayNum: 2, theme: '', travelMode: 'walking' },
    ],
  }
}

function response(body: string): MinimalResponse {
  return { ok: true, status: 200, text: async () => body }
}

function envFor(map: Record<string, string>, queryUrl: string | null = null): LoaderEnv {
  return {
    fetchUrl: async url => {
      const v = map[url]
      if (v == null) throw new Error(`unmocked: ${url}`)
      return response(v)
    },
    readQueryUrl: () => queryUrl,
    defaultUrl: '/trip.json',
  }
}

describe('per-trip isolation through useTripLoader (task 4.6)', () => {
  beforeEach(() => {
    setStorageAdapter(new InMemoryAdapter())
    useTrip().setActiveTrip(null)
    usePlaceState().unload()
    useDayPlan().unload()
    useFilters().unload()
  })
  afterEach(async () => {
    await flushThrottledWrites()
  })

  it('switching active trip in the locker preserves each trip state independently', async () => {
    const A = JSON.stringify(tripFor('A'))
    const B = JSON.stringify(tripFor('B'))

    // Load trip A and stage some state.
    let r = await useTripLoader(envFor({ '/trip.json': A })).resolve()
    expect(r.ok).toBe(true)
    expect(useTrip().trip.value?.trip.id).toBe('A')
    usePlaceState().setState('A-p1', 'wishlist')
    useDayPlan().assignToSlot('d1', 'morning', 'A-p1')
    useFilters().setSearch('alpha')
    await flushThrottledWrites()

    // Switch active trip to B via the URL channel.
    r = await useTripLoader(
      envFor({ 'https://example.com/B.json': B }, 'https://example.com/B.json'),
    ).resolve()
    expect(r.ok).toBe(true)
    expect(useTrip().trip.value?.trip.id).toBe('B')
    expect(usePlaceState().getState('A-p1')).toBe('untouched') // not in trip B
    expect(useDayPlan().getSlot('d1', 'morning')).toEqual([])
    expect(useFilters().filters.value.search).toBe('') // taxonomy-default for B

    // Stage different state in B
    usePlaceState().setState('B-p1', 'scheduled')
    useFilters().setSearch('beta')
    await flushThrottledWrites()

    // Switch back to A via the trip switcher (sets active id; resolve loads
    // it from the locker's cached sourceJson).
    await useTripLocker().setActiveId('A')
    r = await useTripLoader(envFor({})).resolve()
    expect(r.ok).toBe(true)
    expect(useTrip().trip.value?.trip.id).toBe('A')
    // assignToSlot auto-scheduled A-p1, overriding the prior 'wishlist'.
    expect(usePlaceState().getState('A-p1')).toBe('scheduled')
    expect(useDayPlan().getSlot('d1', 'morning')).toEqual(['A-p1'])
    expect(useFilters().filters.value.search).toBe('alpha')

    // And B's state is intact behind the scenes too.
    await useTripLocker().setActiveId('B')
    r = await useTripLoader(envFor({})).resolve()
    expect(r.ok).toBe(true)
    expect(useTrip().trip.value?.trip.id).toBe('B')
    expect(usePlaceState().getState('B-p1')).toBe('scheduled')
    expect(useFilters().filters.value.search).toBe('beta')
  })
})
