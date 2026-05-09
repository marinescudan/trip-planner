import { describe, expect, it } from 'vitest'

import type { Day } from '../../types/day'

import { pickDefaultOpenDay } from '../../utils/default-day'

function makeDay(id: string, date: string, dayNum: number): Day {
  return {
    id,
    date,
    dayNum,
    theme: '',
    travelMode: 'walking',
  }
}

const days: Day[] = [
  makeDay('d1', '2026-05-12', 1),
  makeDay('d2', '2026-05-13', 2),
  makeDay('d3', '2026-05-14', 3),
  makeDay('d4', '2026-05-15', 4),
]

describe('pickDefaultOpenDay', () => {
  it('returns the matching day when today is in range', () => {
    expect(pickDefaultOpenDay('2026-05-15', days)).toBe('d4')
  })

  it('returns day 1 when today is before the trip', () => {
    expect(pickDefaultOpenDay('2026-05-08', days)).toBe('d1')
  })

  it('returns null when today is after the trip', () => {
    expect(pickDefaultOpenDay('2026-06-01', days)).toBeNull()
  })

  it('returns null for an empty trip', () => {
    expect(pickDefaultOpenDay('2026-05-15', [])).toBeNull()
  })

  it('falls back to day 1 when in-range but no exact match (gap)', () => {
    const sparse = [
      makeDay('d1', '2026-05-12', 1),
      makeDay('d3', '2026-05-14', 3),
    ]
    expect(pickDefaultOpenDay('2026-05-13', sparse)).toBe('d1')
  })
})
