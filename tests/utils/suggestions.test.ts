import { describe, expect, it } from 'vitest'

import type { Day } from '../../types/day'
import type { Place } from '../../types/place'
import type { PriorityTierDef } from '../../types/taxonomy'

import { computeSuggestions } from '../../utils/suggestions'

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
