import { describe, expect, it } from 'vitest'

import type { Day } from '../../types/day'
import type { Place } from '../../types/place'
import type { PriorityTierDef, SlotDef } from '../../types/taxonomy'

import { computeFlatDaySuggestions, computeSuggestions } from '../../utils/suggestions'

const tiers: PriorityTierDef[] = [
  { id: 'must', label: 'Must', color: '#f00', weight: 100 },
  { id: 'rec', label: 'Recommended', color: '#ff0', weight: 50 },
  { id: 'opt', label: 'Optional', color: '#0f0', weight: 10 },
]

const day: Day = {
  id: 'd1',
  date: '2026-05-12',
  dayNum: 1,
  theme: '',
  travelMode: 'walking',
}

function makePlace(over: Partial<Place>): Place {
  return {
    id: 'x',
    name: 'X',
    type: 'monument',
    area: 'Centro',
    coords: [36, -4],
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

describe('computeSuggestions', () => {
  it('keeps only places whose validSlots include the slot', () => {
    const out = computeSuggestions({
      day,
      slot: 'morning',
      candidatePlaces: [
        makePlace({ id: 'a', name: 'A', validSlots: ['morning'] }),
        makePlace({ id: 'b', name: 'B', validSlots: ['night'] }),
      ],
      todaysAssignments: {},
      priorityTiers: tiers,
    })
    expect(out.map(p => p.id)).toEqual(['a'])
  })

  it('respects validDays when set', () => {
    const out = computeSuggestions({
      day,
      slot: 'morning',
      candidatePlaces: [
        makePlace({ id: 'a', name: 'A', validDays: ['2026-05-12'] }),
        makePlace({ id: 'b', name: 'B', validDays: ['2026-05-20'] }),
        makePlace({ id: 'c', name: 'C', validDays: null }),
      ],
      todaysAssignments: {},
      priorityTiers: tiers,
    })
    expect(out.map(p => p.id).sort()).toEqual(['a', 'c'])
  })

  it('excludes places already scheduled today (any slot)', () => {
    const out = computeSuggestions({
      day,
      slot: 'afternoon',
      candidatePlaces: [
        makePlace({ id: 'a', name: 'A', validSlots: ['afternoon'] }),
        makePlace({ id: 'b', name: 'B', validSlots: ['afternoon'] }),
      ],
      todaysAssignments: { morning: ['a'] },
      priorityTiers: tiers,
    })
    expect(out.map(p => p.id)).toEqual(['b'])
  })

  it('sorts by priority weight desc, then alpha', () => {
    const out = computeSuggestions({
      day,
      slot: 'morning',
      candidatePlaces: [
        makePlace({ id: 'a', name: 'Bravo', priority: 'rec' }),
        makePlace({ id: 'b', name: 'Alpha', priority: 'must' }),
        makePlace({ id: 'c', name: 'Charlie', priority: 'must' }),
      ],
      todaysAssignments: {},
      priorityTiers: tiers,
    })
    expect(out.map(p => p.id)).toEqual(['b', 'c', 'a'])
  })

  it('does not mutate the input list', () => {
    const list = [
      makePlace({ id: 'a', name: 'Z', priority: 'opt' }),
      makePlace({ id: 'b', name: 'A', priority: 'must' }),
    ]
    const before = list.map(p => p.id).join(',')
    computeSuggestions({
      day,
      slot: 'morning',
      candidatePlaces: list,
      todaysAssignments: {},
      priorityTiers: tiers,
    })
    expect(list.map(p => p.id).join(',')).toBe(before)
  })
})

const slotDefs: SlotDef[] = [
  { id: 'morning', label: 'Morning', order: 1 },
  { id: 'lunch', label: 'Lunch', order: 2 },
  { id: 'afternoon', label: 'Afternoon', order: 3 },
  { id: 'dinner', label: 'Dinner', order: 4 },
]

describe('computeFlatDaySuggestions', () => {
  it('caps to topN (default 8)', () => {
    const candidates = Array.from({ length: 12 }).map((_, i) =>
      makePlace({
        id: `p${i}`,
        name: `P${String(i).padStart(2, '0')}`,
        validSlots: ['morning'],
        priority: 'must',
      }),
    )
    const out = computeFlatDaySuggestions({
      day,
      taxonomy: { slots: slotDefs },
      candidatePlaces: candidates,
      todaysAssignments: {},
      priorityTiers: tiers,
    })
    expect(out).toHaveLength(8)
  })

  it('honours a custom topN', () => {
    const candidates = Array.from({ length: 6 }).map((_, i) =>
      makePlace({ id: `p${i}`, name: `P${i}`, validSlots: ['morning'] }),
    )
    const out = computeFlatDaySuggestions(
      {
        day,
        taxonomy: { slots: slotDefs },
        candidatePlaces: candidates,
        todaysAssignments: {},
        priorityTiers: tiers,
      },
      3,
    )
    expect(out).toHaveLength(3)
  })

  it('deduplicates: a place valid in multiple slots appears once', () => {
    const out = computeFlatDaySuggestions({
      day,
      taxonomy: { slots: slotDefs },
      candidatePlaces: [
        makePlace({
          id: 'a',
          name: 'A',
          validSlots: ['morning', 'lunch', 'dinner'],
        }),
      ],
      todaysAssignments: {},
      priorityTiers: tiers,
    })
    expect(out.map(p => p.id)).toEqual(['a'])
  })

  it('respects validDays', () => {
    const out = computeFlatDaySuggestions({
      day,
      taxonomy: { slots: slotDefs },
      candidatePlaces: [
        makePlace({ id: 'a', name: 'A', validSlots: ['morning'], validDays: ['2026-05-12'] }),
        makePlace({ id: 'b', name: 'B', validSlots: ['morning'], validDays: ['2026-05-20'] }),
        makePlace({ id: 'c', name: 'C', validSlots: ['morning'], validDays: null }),
      ],
      todaysAssignments: {},
      priorityTiers: tiers,
    })
    expect(out.map(p => p.id).sort()).toEqual(['a', 'c'])
  })

  it('excludes places already scheduled today (any slot)', () => {
    const out = computeFlatDaySuggestions({
      day,
      taxonomy: { slots: slotDefs },
      candidatePlaces: [
        makePlace({ id: 'a', name: 'A', validSlots: ['morning'] }),
        makePlace({ id: 'b', name: 'B', validSlots: ['lunch'] }),
      ],
      todaysAssignments: { dinner: ['a'] },
      priorityTiers: tiers,
    })
    expect(out.map(p => p.id)).toEqual(['b'])
  })

  it('drops places whose validSlots do not intersect taxonomy.slots', () => {
    const out = computeFlatDaySuggestions({
      day,
      taxonomy: { slots: slotDefs },
      candidatePlaces: [
        makePlace({ id: 'a', name: 'A', validSlots: ['morning'] }),
        makePlace({ id: 'b', name: 'B', validSlots: ['midnight'] }),
      ],
      todaysAssignments: {},
      priorityTiers: tiers,
    })
    expect(out.map(p => p.id)).toEqual(['a'])
  })

  it('sorts by priority weight desc, then alpha', () => {
    const out = computeFlatDaySuggestions({
      day,
      taxonomy: { slots: slotDefs },
      candidatePlaces: [
        makePlace({ id: 'a', name: 'Bravo', priority: 'rec', validSlots: ['morning'] }),
        makePlace({ id: 'b', name: 'Alpha', priority: 'must', validSlots: ['lunch'] }),
        makePlace({ id: 'c', name: 'Charlie', priority: 'must', validSlots: ['dinner'] }),
      ],
      todaysAssignments: {},
      priorityTiers: tiers,
    })
    expect(out.map(p => p.id)).toEqual(['b', 'c', 'a'])
  })

  it('does not mutate the input list', () => {
    const list = [
      makePlace({ id: 'a', name: 'Z', priority: 'opt', validSlots: ['morning'] }),
      makePlace({ id: 'b', name: 'A', priority: 'must', validSlots: ['lunch'] }),
    ]
    const before = list.map(p => p.id).join(',')
    computeFlatDaySuggestions({
      day,
      taxonomy: { slots: slotDefs },
      candidatePlaces: list,
      todaysAssignments: {},
      priorityTiers: tiers,
    })
    expect(list.map(p => p.id).join(',')).toBe(before)
  })
})
