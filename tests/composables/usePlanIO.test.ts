/**
 * Phase 9 — `usePlanIO` round-trip + cross-trip refusal + reset.
 *
 * Spec scenarios:
 *   - "Round-trip export/import": exporting then importing produces
 *     identical state.
 *   - "Reset confirmation" / "Reset all state": all three per-trip keys
 *     are cleared.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useDayPlan } from '../../composables/useDayPlan'
import { useFilters } from '../../composables/useFilters'
import { usePlaceState } from '../../composables/usePlaceState'
import { usePlanIO } from '../../composables/usePlanIO'
import {
  flushThrottledWrites,
  InMemoryAdapter,
  setStorageAdapter,
  tripKey,
  useStorage,
} from '../../composables/useStorage'
import { useTrip } from '../../composables/useTrip'
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
      {
        id: `${id}-p2`,
        name: 'P2',
        type: 'food',
        area: 'a',
        coords: [40, -3],
        photos: [{ src: 'https://example.com/y.jpg', alt: 'y' }],
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
    ],
  }
}

async function activateTrip(id: string): Promise<void> {
  useTrip().setActiveTrip(tripFor(id))
  await usePlaceState().loadForTrip(id)
  await useDayPlan().loadForTrip(id)
  await useFilters().loadForTrip(id)
}

describe('usePlanIO', () => {
  beforeEach(async () => {
    setStorageAdapter(new InMemoryAdapter())
    useTrip().setActiveTrip(null)
    usePlaceState().unload()
    useDayPlan().unload()
    useFilters().unload()
    await activateTrip('A')
  })
  afterEach(async () => {
    await flushThrottledWrites()
  })

  it('builds a versioned export carrying states/days/filters for the active trip', async () => {
    usePlaceState().setState('A-p1', 'wishlist')
    useDayPlan().assignToSlot('d1', 'morning', 'A-p2')
    useFilters().setSearch('hello')
    await flushThrottledWrites()

    const plan = await usePlanIO().buildExport()
    expect(plan).not.toBeNull()
    expect(plan!.version).toBe(1)
    expect(plan!.tripId).toBe('A')
    expect(plan!.states['A-p1']).toBe('wishlist')
    // P2 was scheduled by `assignToSlot` (auto-schedule).
    expect(plan!.states['A-p2']).toBe('scheduled')
    expect(plan!.days.d1!.morning).toEqual(['A-p2'])
    expect(plan!.filters.search).toBe('hello')
  })

  it('round-trips: exporting then re-importing reproduces in-memory state', async () => {
    usePlaceState().setState('A-p1', 'done')
    useDayPlan().assignToSlot('d1', 'morning', 'A-p1')
    useFilters().setSearch('round-trip')
    await flushThrottledWrites()
    const plan = await usePlanIO().buildExport()
    expect(plan).not.toBeNull()

    // Wipe in-memory state to simulate a different device.
    setStorageAdapter(new InMemoryAdapter())
    await activateTrip('A')
    expect(usePlaceState().getState('A-p1')).toBe('untouched')
    expect(useDayPlan().getSlot('d1', 'morning')).toEqual([])
    expect(useFilters().filters.value.search).toBe('')

    const result = await usePlanIO().importPlan(plan!)
    expect(result.ok).toBe(true)
    // assignToSlot had auto-scheduled A-p1, but the explicit setState('done')
    // ran afterwards — exported/imported state is `done`.
    expect(usePlaceState().getState('A-p1')).toBe('done')
    expect(useDayPlan().getSlot('d1', 'morning')).toEqual(['A-p1'])
    expect(useFilters().filters.value.search).toBe('round-trip')
  })

  it('refuses to import a plan whose tripId does not match the active trip', async () => {
    const plan = await usePlanIO().buildExport()
    expect(plan).not.toBeNull()

    await activateTrip('B')
    const result = await usePlanIO().importPlan(plan!)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('"A"')
      expect(result.error).toContain('"B"')
    }
  })

  it('parsePlan rejects malformed JSON and bad shapes', () => {
    expect(usePlanIO().parsePlan('not json').ok).toBe(false)
    expect(usePlanIO().parsePlan('{}').ok).toBe(false)
    expect(
      usePlanIO().parsePlan(
        JSON.stringify({ version: 1, tripId: 'A', exportedAt: 'now', states: 'oops', days: {}, filters: {} }),
      ).ok,
    ).toBe(false)
  })

  it('resetAllState clears every per-trip key and re-hydrates empty', async () => {
    usePlaceState().setState('A-p1', 'wishlist')
    useDayPlan().assignToSlot('d1', 'morning', 'A-p2')
    useFilters().setSearch('keep me')
    await flushThrottledWrites()

    const adapter = useStorage()
    expect(await adapter.list('trip:A:')).toEqual(
      expect.arrayContaining([tripKey('A', 'states'), tripKey('A', 'days'), tripKey('A', 'filters')]),
    )

    await usePlanIO().resetAllState()
    expect(await adapter.list('trip:A:')).toEqual([])
    expect(usePlaceState().getState('A-p1')).toBe('untouched')
    expect(useDayPlan().getSlot('d1', 'morning')).toEqual([])
    expect(useFilters().filters.value.search).toBe('')
  })
})
