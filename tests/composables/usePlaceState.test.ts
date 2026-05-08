import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  flushThrottledWrites,
  InMemoryAdapter,
  setStorageAdapter,
  useStorage,
} from '../../composables/useStorage'
import { usePlaceState } from '../../composables/usePlaceState'
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
    slots: [{ id: 'morning', label: 'm', order: 1 }],
    priorityTiers: [{ id: 'must', label: 'M', color: '#ef4444', weight: 4 }],
    costTiers: [{ id: 'free', label: 'Free', symbol: 'Free', max: 0 }],
    zones: [{ id: 1, label: 'Z1' }],
    energy: [{ id: 'light', label: 'L' }],
  },
  places: [
    place('p1'),
    place('p2'),
  ],
  days: [
    { id: 'd1', date: '2026-01-01', dayNum: 1, theme: '', travelMode: 'walking' },
    { id: 'd2', date: '2026-01-02', dayNum: 2, theme: '', travelMode: 'walking' },
  ],
}

function place(id: string): TripJson['places'][number] {
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
    validSlots: ['morning'],
    tags: [],
    energy: 'light',
    bookingRequired: false,
  }
}

describe('usePlaceState', () => {
  beforeEach(() => {
    setStorageAdapter(new InMemoryAdapter())
    useTrip().setActiveTrip(trip)
    usePlaceState().unload()
  })
  afterEach(async () => {
    await flushThrottledWrites()
  })

  it('returns "untouched" for unknown places', () => {
    const ps = usePlaceState()
    expect(ps.getState('p1')).toBe('untouched')
  })

  it('cycles untouched → wishlist → scheduled → done → untouched', async () => {
    const ps = usePlaceState()
    await ps.loadForTrip('A')
    ps.cycleState('p1'); expect(ps.getState('p1')).toBe('wishlist')
    ps.cycleState('p1'); expect(ps.getState('p1')).toBe('scheduled')
    ps.cycleState('p1'); expect(ps.getState('p1')).toBe('done')
    ps.cycleState('p1'); expect(ps.getState('p1')).toBe('untouched')
  })

  it('skip() forces "skipped" regardless of prior state; cycle restores from skipped', async () => {
    const ps = usePlaceState()
    await ps.loadForTrip('A')
    ps.cycleState('p1') // wishlist
    ps.skip('p1')
    expect(ps.getState('p1')).toBe('skipped')
    ps.cycleState('p1')
    expect(ps.getState('p1')).toBe('untouched')
  })

  it('does not store untouched states (deleted from record on transition back)', async () => {
    const ps = usePlaceState()
    await ps.loadForTrip('A')
    ps.setState('p1', 'wishlist')
    ps.setState('p1', 'untouched')
    expect(Object.keys(ps.states.value)).toEqual([])
  })

  it('persists per-trip via throttled writes', async () => {
    const ps = usePlaceState()
    await ps.loadForTrip('A')
    ps.setState('p1', 'wishlist')
    await flushThrottledWrites()
    const stored = await useStorage().get(
      'trip:A:states',
      // any schema; we just want to inspect
      (await import('zod')).z.record((await import('zod')).z.string(), (await import('zod')).z.string()),
    )
    expect(stored).toEqual({ p1: 'wishlist' })
  })

  it('coalesces rapid toggles into ≤2 writes per 300ms window', async () => {
    const ps = usePlaceState()
    await ps.loadForTrip('A')
    let writes = 0
    const adapter = new InMemoryAdapter()
    const origSet = adapter.set.bind(adapter)
    adapter.set = async (k, v, s) => { writes++; return origSet(k, v, s) }
    setStorageAdapter(adapter)
    await ps.loadForTrip('A')

    ps.setState('p1', 'wishlist')
    ps.setState('p1', 'scheduled')
    ps.setState('p1', 'done')
    ps.setState('p1', 'wishlist')
    ps.setState('p1', 'scheduled')
    await new Promise(r => setTimeout(r, 250))
    expect(writes).toBeLessThanOrEqual(2)
  })

  it('prunes unknown placeIds on hydrate (orphan place dropped silently)', async () => {
    // Plant an entry for a placeId that does not exist in the active trip.
    const adapter = new InMemoryAdapter()
    setStorageAdapter(adapter)
    const { z } = await import('zod')
    await adapter.set(
      'trip:A:states',
      { 'p1': 'wishlist', 'p-deleted': 'scheduled' },
      z.record(z.string(), z.string()),
    )
    const ps = usePlaceState()
    await ps.loadForTrip('A')
    expect(ps.getState('p1')).toBe('wishlist')
    expect(ps.getState('p-deleted')).toBe('untouched')
  })

  it('hydrates each trip independently (cross-trip isolation)', async () => {
    const ps = usePlaceState()
    await ps.loadForTrip('A')
    ps.setState('p1', 'wishlist')
    await flushThrottledWrites()

    // Switch to trip B (active trip object also changes in real flow)
    useTrip().setActiveTrip({
      ...trip,
      trip: { ...trip.trip, id: 'B' },
      places: [place('q1')],
    })
    await ps.loadForTrip('B')
    expect(ps.getState('p1')).toBe('untouched') // not in trip B
    ps.setState('q1', 'scheduled')
    await flushThrottledWrites()

    // Back to A
    useTrip().setActiveTrip(trip)
    await ps.loadForTrip('A')
    expect(ps.getState('p1')).toBe('wishlist')
    expect(ps.getState('q1')).toBe('untouched')
  })

  it('drops invalid stored values silently (treats as empty)', async () => {
    const adapter = new InMemoryAdapter()
    setStorageAdapter(adapter)
    const { z } = await import('zod')
    // Plant a value that fails schema (state="purple" is not a valid PlaceState)
    await adapter.set(
      'trip:A:states',
      { p1: 'purple' },
      z.record(z.string(), z.string()),
    )
    const ps = usePlaceState()
    await ps.loadForTrip('A')
    expect(ps.getState('p1')).toBe('untouched')
  })
})
