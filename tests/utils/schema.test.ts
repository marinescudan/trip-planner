/**
 * Tests for `utils/schema.ts` — Trip JSON v1.0 validator.
 *
 * Covers each scenario named in the trip-schema spec:
 *   - Missing $schema, future-major schema
 *   - endDate < startDate, birthday outside trip range
 *   - Duplicate place id, place coords out of bounds
 *   - Unknown FK (priority, slot)
 *   - Days with a gap
 *   - Forward-compat: unknown top-level key is ignored
 */

import { describe, expect, it } from 'vitest'
import { validateTripJson, type TripJson } from '../../utils/schema'

const minimalValid: TripJson = {
  $schema: 'trip-app/v1.0.0',
  trip: {
    id: 'fixture-trip',
    title: 'Fixture',
    startDate: '2026-01-01',
    endDate: '2026-01-02',
    timezone: 'Europe/Madrid',
    currency: 'EUR',
    language: 'en',
    travelers: [{ id: 'a', name: 'Alice' }],
  },
  homeBases: [
    {
      id: 'hb-1',
      label: 'Stay',
      city: 'Test City',
      coords: [40, -3],
      dateRange: { from: '2026-01-01', to: '2026-01-02' },
    },
  ],
  taxonomy: {
    slots: [{ id: 'morning', label: 'Morning', order: 1 }],
    priorityTiers: [
      { id: 'must', label: 'Must', color: '#ef4444', weight: 4 },
    ],
    costTiers: [{ id: 'free', label: 'Free', symbol: 'Free', max: 0 }],
    zones: [{ id: 1, label: 'Walking' }],
    energy: [{ id: 'light', label: 'Light' }],
  },
  places: [
    {
      id: 'p1',
      name: 'Place One',
      type: 'monument',
      area: 'Centro',
      coords: [40, -3],
      photos: [{ src: 'https://example.com/img.jpg', alt: 'img' }],
      description: 'desc',
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
    {
      id: 'd1',
      date: '2026-01-01',
      dayNum: 1,
      theme: 'Arrive',
      travelMode: 'walking',
    },
    {
      id: 'd2',
      date: '2026-01-02',
      dayNum: 2,
      theme: 'Explore',
      travelMode: 'walking',
    },
  ],
}

describe('validateTripJson', () => {
  it('round-trips a minimal valid trip', () => {
    const r = validateTripJson(minimalValid)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.trip.trip.id).toBe('fixture-trip')
      expect(r.trip.places).toHaveLength(1)
      expect(r.trip.days).toHaveLength(2)
    }
  })

  it('rejects missing $schema', () => {
    const { $schema: _drop, ...rest } = minimalValid
    void _drop
    const r = validateTripJson(rest)
    expect(r.ok).toBe(false)
  })

  it('rejects a future-major $schema', () => {
    const r = validateTripJson({ ...minimalValid, $schema: 'trip-app/v2.0.0' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(
        r.errors.some(e => e.path.join('.') === '$schema'),
      ).toBe(true)
    }
  })

  it('ignores unknown top-level keys (forward-compatible)', () => {
    const r = validateTripJson({
      ...minimalValid,
      experimental: { foo: 'bar' },
    })
    expect(r.ok).toBe(true)
  })

  it('rejects endDate before startDate', () => {
    const r = validateTripJson({
      ...minimalValid,
      trip: {
        ...minimalValid.trip,
        startDate: '2026-01-05',
        endDate: '2026-01-02',
      },
    })
    expect(r.ok).toBe(false)
  })

  it('rejects birthday outside trip range', () => {
    const r = validateTripJson({
      ...minimalValid,
      trip: {
        ...minimalValid.trip,
        travelers: [
          { id: 'a', name: 'Alice', birthdayDuringTrip: '2026-12-25' },
        ],
      },
    })
    expect(r.ok).toBe(false)
  })

  it('rejects duplicate place id', () => {
    const dupe = minimalValid.places[0]!
    const r = validateTripJson({
      ...minimalValid,
      places: [dupe, { ...dupe }],
    })
    expect(r.ok).toBe(false)
  })

  it('rejects coords out of bounds', () => {
    const p = minimalValid.places[0]!
    const r = validateTripJson({
      ...minimalValid,
      places: [{ ...p, coords: [200, 500] }],
    })
    expect(r.ok).toBe(false)
  })

  it('rejects unknown priority FK', () => {
    const p = minimalValid.places[0]!
    const r = validateTripJson({
      ...minimalValid,
      places: [{ ...p, priority: 'essential' }],
    })
    expect(r.ok).toBe(false)
  })

  it('rejects unknown slot reference', () => {
    const p = minimalValid.places[0]!
    const r = validateTripJson({
      ...minimalValid,
      places: [{ ...p, validSlots: ['dinner'] }],
    })
    expect(r.ok).toBe(false)
  })

  it('rejects days with a gap', () => {
    const r = validateTripJson({
      ...minimalValid,
      trip: { ...minimalValid.trip, endDate: '2026-01-03' },
      days: [
        {
          id: 'd1',
          date: '2026-01-01',
          dayNum: 1,
          theme: 't',
          travelMode: 'walking',
        },
        {
          id: 'd3',
          date: '2026-01-03',
          dayNum: 3,
          theme: 't',
          travelMode: 'walking',
        },
      ],
    })
    expect(r.ok).toBe(false)
  })
})
