import { describe, expect, it } from 'vitest'

import type { Place } from '../../types/place'

import {
  MAX_DAY_ROUTE_STOPS,
  buildDayRouteUrl,
  buildPlaceMapsUrl,
} from '../../utils/maps'

function makePlace(over: Partial<Place> & { id: string }): Place {
  return {
    name: over.id,
    type: 'monument',
    area: 'Centro',
    coords: [36.72, -4.42],
    photos: [],
    description: '',
    priority: 'rec',
    zone: '1',
    cost: 'free',
    duration: 60,
    validSlots: ['morning'],
    tags: [],
    energy: 'low',
    bookingRequired: false,
    ...over,
  }
}

// --- buildPlaceMapsUrl ----------------------------------------------------

describe('buildPlaceMapsUrl', () => {
  it('returns the mapsUrl for a normal place', () => {
    const p = makePlace({ id: 'a', mapsUrl: 'https://maps.example/a' })
    expect(buildPlaceMapsUrl(p)).toBe('https://maps.example/a')
  })

  it('returns null for type=logistics regardless of mapsUrl', () => {
    const p = makePlace({ id: 'log-a', type: 'logistics', mapsUrl: 'https://x/y' })
    expect(buildPlaceMapsUrl(p)).toBeNull()
  })

  it('returns null when mapsUrl is missing', () => {
    const p = makePlace({ id: 'a' })
    expect(buildPlaceMapsUrl(p)).toBeNull()
  })

  it('returns null when mapsUrl is whitespace', () => {
    const p = makePlace({ id: 'a', mapsUrl: '   ' })
    expect(buildPlaceMapsUrl(p)).toBeNull()
  })
})

// --- buildDayRouteUrl -----------------------------------------------------

describe('buildDayRouteUrl', () => {
  it('returns null url for empty list', () => {
    const r = buildDayRouteUrl([], 'walking')
    expect(r.url).toBeNull()
    expect(r.total).toBe(0)
    expect(r.used).toBe(0)
    expect(r.truncated).toBe(false)
  })

  it('uses /maps/?q= for a single stop with travelmode chained via &', () => {
    const p = makePlace({ id: 'ronda', coords: [36.7424, -5.1656] })
    const r = buildDayRouteUrl([p], 'walking')
    expect(r.url).toBe('https://www.google.com/maps/?q=36.7424,-5.1656&travelmode=walking')
    expect(r.used).toBe(1)
    expect(r.truncated).toBe(false)
  })

  it('single-stop URL has no travelmode for mixed', () => {
    const p = makePlace({ id: 'ronda', coords: [36.7424, -5.1656] })
    const r = buildDayRouteUrl([p], 'mixed')
    expect(r.url).toBe('https://www.google.com/maps/?q=36.7424,-5.1656')
  })

  it('uses /maps/dir/ with N segments for multiple stops', () => {
    const places = [
      makePlace({ id: 'a', coords: [36.7, -4.4] }),
      makePlace({ id: 'b', coords: [36.71, -4.41] }),
      makePlace({ id: 'c', coords: [36.72, -4.42] }),
      makePlace({ id: 'd', coords: [36.73, -4.43] }),
    ]
    const r = buildDayRouteUrl(places, 'walking')
    expect(r.url).toBe(
      'https://www.google.com/maps/dir/36.7,-4.4/36.71,-4.41/36.72,-4.42/36.73,-4.43?travelmode=walking',
    )
    expect(r.used).toBe(4)
    expect(r.truncated).toBe(false)
  })

  it('caps at MAX_DAY_ROUTE_STOPS and reports truncation', () => {
    const places = Array.from({ length: 11 }, (_, i) =>
      makePlace({ id: `p${i}`, coords: [36 + i * 0.01, -4 - i * 0.01] }),
    )
    const r = buildDayRouteUrl(places, 'driving')
    expect(r.total).toBe(11)
    expect(r.used).toBe(MAX_DAY_ROUTE_STOPS)
    expect(r.truncated).toBe(true)
    expect(r.url!.split('/dir/')[1]!.split('?')[0]!.split('/')).toHaveLength(MAX_DAY_ROUTE_STOPS)
  })

  it('skips places with [0,0] sentinel coords', () => {
    const places = [
      makePlace({ id: 'a', coords: [36.7, -4.4] }),
      makePlace({ id: 'log', coords: [0, 0] }),
      makePlace({ id: 'b', coords: [36.8, -4.5] }),
    ]
    const r = buildDayRouteUrl(places, 'walking')
    expect(r.total).toBe(2)
    expect(r.url).toContain('36.7,-4.4/36.8,-4.5')
    expect(r.url).not.toContain('0,0')
  })

  it('appends travelmode=walking', () => {
    const r = buildDayRouteUrl([makePlace({ id: 'a' }), makePlace({ id: 'b' })], 'walking')
    expect(r.url).toContain('?travelmode=walking')
  })

  it('appends travelmode=driving', () => {
    const r = buildDayRouteUrl([makePlace({ id: 'a' }), makePlace({ id: 'b' })], 'driving')
    expect(r.url).toContain('?travelmode=driving')
  })

  it('appends travelmode=transit', () => {
    const r = buildDayRouteUrl([makePlace({ id: 'a' }), makePlace({ id: 'b' })], 'transit')
    expect(r.url).toContain('?travelmode=transit')
  })

  it('omits travelmode for mixed', () => {
    const r = buildDayRouteUrl([makePlace({ id: 'a' }), makePlace({ id: 'b' })], 'mixed')
    expect(r.url).not.toContain('travelmode')
  })
})
