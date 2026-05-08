import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useFilters } from '../../composables/useFilters'
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
    slots: [{ id: 'morning', label: 'm', order: 1 }],
    priorityTiers: [
      { id: 'must', label: 'M', color: '#ef4444', weight: 4 },
      { id: 'opt', label: 'O', color: '#10b981', weight: 1 },
    ],
    costTiers: [
      { id: 'free', label: 'Free', symbol: 'Free', max: 0 },
      { id: 'eee', label: '€€€', symbol: '€€€', max: 999 },
    ],
    zones: [
      { id: 1, label: 'Z1' },
      { id: 2, label: 'Z2' },
    ],
    energy: [{ id: 'light', label: 'L' }],
  },
  places: [
    place({ id: 'p1', name: 'Málaga Cathedral', priority: 'must', zone: 1, cost: 'free', tags: ['art', 'photo-friendly'] }),
    place({ id: 'p2', name: 'Pricey Steakhouse',  priority: 'opt', zone: 2, cost: 'eee', tags: ['food'] }),
    place({ id: 'p3', name: 'Bolonia Beach',      priority: 'must', zone: 2, cost: 'free', tags: ['nature'] }),
    place({ id: 'p4', name: 'Photography Walk',   priority: 'opt', zone: 1, cost: 'free', tags: ['art', 'photo-friendly'] }),
  ],
  days: [
    { id: 'd1', date: '2026-01-01', dayNum: 1, theme: '', travelMode: 'walking' },
    { id: 'd2', date: '2026-01-02', dayNum: 2, theme: '', travelMode: 'walking' },
  ],
}

function place(opts: {
  id: string; name: string; priority: string; zone: number; cost: string; tags: string[]
}): TripJson['places'][number] {
  return {
    id: opts.id,
    name: opts.name,
    type: 'monument',
    area: 'a',
    coords: [40, -3],
    photos: [{ src: 'https://example.com/x.jpg', alt: 'x' }],
    description: '',
    priority: opts.priority,
    zone: opts.zone,
    cost: opts.cost,
    duration: 60,
    validSlots: ['morning'],
    tags: opts.tags,
    energy: 'light',
    bookingRequired: false,
  }
}

describe('useFilters', () => {
  beforeEach(async () => {
    setStorageAdapter(new InMemoryAdapter())
    useTrip().setActiveTrip(trip)
    usePlaceState().unload()
    useFilters().unload()
    await usePlaceState().loadForTrip('A')
    await useFilters().loadForTrip('A')
  })
  afterEach(async () => {
    await flushThrottledWrites()
  })

  it('defaults from taxonomy: all priorityTiers / zones / costTiers selected', () => {
    const f = useFilters()
    expect([...f.filters.value.priorityTiers].sort()).toEqual(['must', 'opt'])
    expect([...f.filters.value.zones].sort()).toEqual([1, 2])
    expect([...f.filters.value.costTiers].sort()).toEqual(['eee', 'free'])
    expect(f.filters.value.tags).toEqual([])
    expect(f.filters.value.tagsAndMode).toBe(false)
    expect(f.filters.value.search).toBe('')
    expect(f.filters.value.showHidden).toBe(false)
  })

  it('default filteredPlaces returns the full catalog', () => {
    const f = useFilters()
    expect(f.filteredPlaces.value).toHaveLength(4)
    expect(f.counts.value).toEqual([4, 4])
  })

  it('priority filter: hiding "opt" leaves only must places', () => {
    const f = useFilters()
    f.setPriorityTiers(['must'])
    expect(f.filteredPlaces.value.map(p => p.id).sort()).toEqual(['p1', 'p3'])
  })

  it('zone filter: only zone 1', () => {
    const f = useFilters()
    f.setZones([1])
    expect(f.filteredPlaces.value.map(p => p.id).sort()).toEqual(['p1', 'p4'])
  })

  it('cost filter: only free', () => {
    const f = useFilters()
    f.setCostTiers(['free'])
    expect(f.filteredPlaces.value.map(p => p.id).sort()).toEqual(['p1', 'p3', 'p4'])
  })

  it('tag filter OR (default): art OR food', () => {
    const f = useFilters()
    f.setTags(['art', 'food'])
    expect(f.filteredPlaces.value.map(p => p.id).sort()).toEqual(['p1', 'p2', 'p4'])
  })

  it('tag filter AND: art AND photo-friendly', () => {
    const f = useFilters()
    f.setTags(['art', 'photo-friendly'])
    f.setTagsAndMode(true)
    expect(f.filteredPlaces.value.map(p => p.id).sort()).toEqual(['p1', 'p4'])
  })

  it('search is accent-insensitive ("Málaga" matches "malaga")', () => {
    const f = useFilters()
    f.setSearch('malaga')
    expect(f.filteredPlaces.value.map(p => p.id)).toEqual(['p1'])
  })

  it('search matches name, area, or tags', () => {
    const f = useFilters()
    f.setSearch('bolonia')
    expect(f.filteredPlaces.value.map(p => p.id)).toEqual(['p3'])
  })

  it('hides skipped places by default; showHidden=true includes them', () => {
    const f = useFilters()
    const ps = usePlaceState()
    ps.skip('p1')
    expect(f.filteredPlaces.value.map(p => p.id)).not.toContain('p1')
    f.setShowHidden(true)
    expect(f.filteredPlaces.value.map(p => p.id)).toContain('p1')
  })

  it('reset returns to taxonomy defaults; place state untouched', () => {
    const f = useFilters()
    const ps = usePlaceState()
    ps.skip('p1')
    f.setZones([1])
    f.setSearch('xyz')
    f.reset()
    expect([...f.filters.value.zones].sort()).toEqual([1, 2])
    expect(f.filters.value.search).toBe('')
    expect(ps.getState('p1')).toBe('skipped') // place state preserved
  })

  it('persists per-trip filter state', async () => {
    const f = useFilters()
    f.setSearch('bolonia')
    await flushThrottledWrites()

    f.unload()
    await f.loadForTrip('A')
    expect(f.filters.value.search).toBe('bolonia')
  })

  it('cross-trip isolation: trip B has its own filter state', async () => {
    const f = useFilters()
    f.setSearch('bolonia')
    await flushThrottledWrites()

    await f.loadForTrip('B')
    expect(f.filters.value.search).toBe('') // taxonomy defaults applied for B

    await f.loadForTrip('A')
    expect(f.filters.value.search).toBe('bolonia')
  })

  it('counts reflect filtered / total', () => {
    const f = useFilters()
    f.setPriorityTiers(['must'])
    expect(f.counts.value).toEqual([2, 4])
  })
})
