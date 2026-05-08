import { beforeEach, describe, expect, it } from 'vitest'

import { useTrip } from '../../composables/useTrip'
import type { TripJson } from '../../utils/schema'

const fixture: TripJson = {
  $schema: 'trip-app/v1.0.0',
  trip: {
    id: 't',
    title: 'T',
    startDate: '2026-01-01',
    endDate: '2026-01-02',
    timezone: 'Europe/Madrid',
    currency: 'EUR',
    language: 'en',
    travelers: [{ id: 'a', name: 'A' }],
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
      id: 'p1',
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
      id: 'p2',
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
    { id: 'd2', date: '2026-01-02', dayNum: 2, theme: '', travelMode: 'walking' },
  ],
}

describe('useTrip', () => {
  beforeEach(() => {
    useTrip().setActiveTrip(null)
  })

  it('starts with no trip', () => {
    const { trip, placeById, dayById } = useTrip()
    expect(trip.value).toBeNull()
    expect(placeById.value.size).toBe(0)
    expect(dayById.value.size).toBe(0)
  })

  it('exposes the active trip and indexed lookups', () => {
    const t = useTrip()
    t.setActiveTrip(fixture)
    expect(t.trip.value?.trip.id).toBe('t')
    expect(t.placeById.value.size).toBe(2)
    expect(t.placeById.value.get('p1')?.name).toBe('P1')
    expect(t.dayById.value.size).toBe(2)
    expect(t.dayById.value.get('d2')?.date).toBe('2026-01-02')
  })

  it('clears state when set to null', () => {
    const t = useTrip()
    t.setActiveTrip(fixture)
    t.setActiveTrip(null)
    expect(t.trip.value).toBeNull()
    expect(t.placeById.value.size).toBe(0)
  })

  it('shares state across instances (module-level ref)', () => {
    const a = useTrip()
    const b = useTrip()
    a.setActiveTrip(fixture)
    expect(b.trip.value?.trip.id).toBe('t')
  })
})
