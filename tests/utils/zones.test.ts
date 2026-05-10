import { describe, expect, it } from 'vitest'

import type { Place, Zone } from '../../types/place'
import type { TripJson } from '../../utils/schema'

import { proximityLabel, zoneToMinutes } from '../../utils/zones'

function makePlace(over: Partial<Place> & { id: string }): Place {
  return {
    name: over.id,
    type: 'monument',
    area: 'Centro',
    coords: [36.72, -4.42],
    photos: [{ src: 'x', alt: 'x' }],
    description: '',
    priority: 'must',
    zone: 1,
    cost: 'free',
    duration: 60,
    validSlots: ['morning'],
    tags: [],
    energy: 'light',
    bookingRequired: false,
    ...over,
  }
}

/** Build a minimal trip stub — only the parts proximityLabel reads. */
function makeTrip(): TripJson {
  return {
    homeBases: [
      {
        id: 'malaga-1',
        label: 'Málaga',
        city: 'Málaga',
        coords: [36.72, -4.42],
        dateRange: { from: '2026-05-12', to: '2026-05-15' },
      },
      {
        id: 'tarifa',
        label: 'Tarifa',
        city: 'Tarifa',
        coords: [36.01, -5.6],
        dateRange: { from: '2026-05-15', to: '2026-05-20' },
      },
    ],
    // The remaining TripJson fields are not read by proximityLabel; cast to
    // silence the structural check while keeping the test focused.
  } as unknown as TripJson
}

describe('zoneToMinutes', () => {
  it('returns ~5\' for zone 1 (numeric)', () => {
    expect(zoneToMinutes(1)).toBe('~5\'')
  })

  it('returns ~15\' for zone 2', () => {
    expect(zoneToMinutes(2)).toBe('~15\'')
  })

  it('returns ~30\' for zone 3', () => {
    expect(zoneToMinutes(3)).toBe('~30\'')
  })

  it('returns ~1h for zone 4 (day trip)', () => {
    expect(zoneToMinutes(4)).toBe('~1h')
  })

  it('treats string and number zone ids identically', () => {
    expect(zoneToMinutes('1' as Zone)).toBe('~5\'')
    expect(zoneToMinutes('4' as Zone)).toBe('~1h')
  })

  it('returns empty string for unknown zones', () => {
    expect(zoneToMinutes(0 as unknown as Zone)).toBe('')
    expect(zoneToMinutes(99 as unknown as Zone)).toBe('')
    expect(zoneToMinutes('zzz' as Zone)).toBe('')
  })
})

describe('proximityLabel', () => {
  const trip = makeTrip()

  it('formats zone 1 with home base label', () => {
    const place = makePlace({ id: 'p1', zone: 1, homeBase: 'malaga-1' })
    expect(proximityLabel(place, trip)).toBe('~5\' Málaga')
  })

  it('formats zone 2 with Tarifa home base', () => {
    const place = makePlace({ id: 'p2', zone: 2, homeBase: 'tarifa' })
    expect(proximityLabel(place, trip)).toBe('~15\' Tarifa')
  })

  it('formats zone 3 with home base', () => {
    const place = makePlace({ id: 'p3', zone: 3, homeBase: 'malaga-1' })
    expect(proximityLabel(place, trip)).toBe('~30\' Málaga')
  })

  it('drops home base for zone 4 (day trip) even when set', () => {
    const place = makePlace({ id: 'p4', zone: 4, homeBase: 'malaga-1' })
    expect(proximityLabel(place, trip)).toBe('~1h')
  })

  it('falls back to minutes-only when place has no home base', () => {
    const place = makePlace({ id: 'p5', zone: 2, homeBase: undefined })
    expect(proximityLabel(place, trip)).toBe('~15\'')
  })

  it('falls back to minutes-only when home base id is unknown', () => {
    const place = makePlace({ id: 'p6', zone: 2, homeBase: 'ghost' })
    expect(proximityLabel(place, trip)).toBe('~15\'')
  })

  it('returns empty string for an unknown zone', () => {
    const place = makePlace({
      id: 'p7',
      zone: 99 as unknown as Zone,
      homeBase: 'malaga-1',
    })
    expect(proximityLabel(place, trip)).toBe('')
  })
})
