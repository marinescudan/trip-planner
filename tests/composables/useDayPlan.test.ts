import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useDayPlan } from '../../composables/useDayPlan'
import { usePlaceState } from '../../composables/usePlaceState'
import {
  flushThrottledWrites,
  InMemoryAdapter,
  setStorageAdapter,
} from '../../composables/useStorage'
import { useTrip } from '../../composables/useTrip'
import type { TripJson } from '../../utils/schema'

const trip: TripJson = {
  $schema: 'trip-app/v1.0.0',
  trip: {
    id: 'A',
    title: 'A',
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
    slots: [
      { id: 'morning', label: 'm', order: 1 },
      { id: 'dinner', label: 'd', order: 2 },
    ],
    priorityTiers: [{ id: 'must', label: 'M', color: '#ef4444', weight: 4 }],
    costTiers: [{ id: 'free', label: 'Free', symbol: 'Free', max: 0 }],
    zones: [{ id: 1, label: 'Z1' }],
    energy: [{ id: 'light', label: 'L' }],
  },
  places: [pl('p1'), pl('p2')],
  days: [
    { id: 'd1', date: '2026-01-01', dayNum: 1, theme: '', travelMode: 'walking' },
    { id: 'd2', date: '2026-01-02', dayNum: 2, theme: '', travelMode: 'walking' },
  ],
}

function pl(id: string): TripJson['places'][number] {
  return {
    id,
    name: id,
    type: 'monument',
    area: 'a',
    coords: [40, -3],
    photos: [{ src: 'https://example.com/x.jpg', alt: 'x' }],
    description: '',
    priority: 'must',
    zone: 1,
    cost: 'free',
    duration: 60,
    validSlots: ['morning', 'dinner'],
    tags: [],
    energy: 'light',
    bookingRequired: false,
  }
}

describe('useDayPlan', () => {
  beforeEach(async () => {
    setStorageAdapter(new InMemoryAdapter())
    useTrip().setActiveTrip(trip)
    useDayPlan().unload()
    usePlaceState().unload()
    await usePlaceState().loadForTrip('A')
    await useDayPlan().loadForTrip('A')
  })
  afterEach(async () => {
    await flushThrottledWrites()
  })

  it('starts empty', () => {
    const dp = useDayPlan()
    expect(dp.getSlot('d1', 'morning')).toEqual([])
  })

  it('assignToSlot appends placeIds and auto-schedules the place', () => {
    const dp = useDayPlan()
    const ps = usePlaceState()
    dp.assignToSlot('d1', 'morning', 'p1')
    expect(dp.getSlot('d1', 'morning')).toEqual(['p1'])
    expect(ps.getState('p1')).toBe('scheduled')
  })

  it('removes a place from any other slot of the SAME day on assign', () => {
    const dp = useDayPlan()
    dp.assignToSlot('d1', 'morning', 'p1')
    dp.assignToSlot('d1', 'dinner', 'p1')
    expect(dp.getSlot('d1', 'morning')).toEqual([])
    expect(dp.getSlot('d1', 'dinner')).toEqual(['p1'])
  })

  it('preserves a place across DIFFERENT days', () => {
    const dp = useDayPlan()
    dp.assignToSlot('d1', 'morning', 'p1')
    dp.assignToSlot('d2', 'morning', 'p1')
    expect(dp.getSlot('d1', 'morning')).toEqual(['p1'])
    expect(dp.getSlot('d2', 'morning')).toEqual(['p1'])
  })

  it('does not downgrade a "done" place to "scheduled" on assign (Done remains done)', () => {
    const dp = useDayPlan()
    const ps = usePlaceState()
    ps.setState('p1', 'done')
    dp.assignToSlot('d1', 'morning', 'p1')
    expect(ps.getState('p1')).toBe('done')
    expect(dp.getSlot('d1', 'morning')).toEqual(['p1'])
  })

  it('removeFromSlot prunes empty slots and empty days', () => {
    const dp = useDayPlan()
    dp.assignToSlot('d1', 'morning', 'p1')
    dp.removeFromSlot('d1', 'morning', 'p1')
    expect(dp.getSlot('d1', 'morning')).toEqual([])
    expect(dp.assignments.value['d1']).toBeUndefined()
  })

  it('persists assignments per-trip', async () => {
    const dp = useDayPlan()
    dp.assignToSlot('d1', 'morning', 'p1')
    await flushThrottledWrites()

    // New composable instance, same module — reload from storage to verify
    dp.unload()
    await dp.loadForTrip('A')
    expect(dp.getSlot('d1', 'morning')).toEqual(['p1'])
  })

  it('cross-trip isolation', async () => {
    const dp = useDayPlan()
    dp.assignToSlot('d1', 'morning', 'p1')
    await flushThrottledWrites()

    await dp.loadForTrip('B')
    expect(dp.getSlot('d1', 'morning')).toEqual([])

    await dp.loadForTrip('A')
    expect(dp.getSlot('d1', 'morning')).toEqual(['p1'])
  })
})
