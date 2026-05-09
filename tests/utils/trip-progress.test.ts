import { describe, expect, it } from 'vitest'

import { daysInclusive, todayISO, tripProgress } from '../../utils/trip-progress'

describe('utils/trip-progress', () => {
  describe('daysInclusive', () => {
    it('counts inclusive day span', () => {
      expect(daysInclusive('2026-05-12', '2026-05-23')).toBe(12)
      expect(daysInclusive('2026-05-12', '2026-05-12')).toBe(1)
    })

    it('crosses month boundaries', () => {
      expect(daysInclusive('2026-05-30', '2026-06-02')).toBe(4)
    })
  })

  describe('todayISO', () => {
    it('formats local date as YYYY-MM-DD', () => {
      const d = new Date(2026, 4, 9, 14, 30) // May is month 4 (0-indexed)
      expect(todayISO(d)).toBe('2026-05-09')
    })

    it('zero-pads single-digit month and day', () => {
      const d = new Date(2026, 0, 3) // Jan 3
      expect(todayISO(d)).toBe('2026-01-03')
    })
  })

  describe('tripProgress', () => {
    it('reports "Pre-trip" before start date', () => {
      const p = tripProgress('2026-05-08', '2026-05-12', '2026-05-23')
      expect(p.phase).toBe('pre')
      expect(p.dayNumber).toBeNull()
      expect(p.total).toBe(12)
      expect(p.label).toBe('Pre-trip')
    })

    it('reports "Day n of N" during the trip', () => {
      const p = tripProgress('2026-05-15', '2026-05-12', '2026-05-23')
      expect(p.phase).toBe('during')
      expect(p.dayNumber).toBe(4)
      expect(p.label).toBe('Day 4 of 12')
    })

    it('marks the first day as Day 1', () => {
      expect(tripProgress('2026-05-12', '2026-05-12', '2026-05-23').label).toBe(
        'Day 1 of 12',
      )
    })

    it('marks the last day as Day N', () => {
      expect(tripProgress('2026-05-23', '2026-05-12', '2026-05-23').label).toBe(
        'Day 12 of 12',
      )
    })

    it('reports "Trip ended" after end date', () => {
      const p = tripProgress('2026-06-01', '2026-05-12', '2026-05-23')
      expect(p.phase).toBe('post')
      expect(p.label).toBe('Trip ended')
    })
  })
})
