import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  InMemoryAdapter,
  setStorageAdapter,
} from '../../composables/useStorage'
import {
  MAX_LOCKER_SIZE,
  useTripLocker,
} from '../../composables/useTripLocker'
import type { UpsertInput } from '../../composables/useTripLocker'

function fixture(id: string): UpsertInput {
  return {
    id,
    title: `Trip ${id}`,
    source: 'url',
    sourceUrl: `https://example.com/${id}.json`,
    sourceJson: JSON.stringify({ id }),
  }
}

describe('useTripLocker', () => {
  beforeEach(() => {
    setStorageAdapter(new InMemoryAdapter())
  })

  it('starts with an empty list and no active id', async () => {
    const l = useTripLocker()
    expect(await l.listEntries()).toEqual([])
    expect(await l.getActiveId()).toBeNull()
  })

  it('upserts an entry, then reads it back via list + getEntry', async () => {
    const l = useTripLocker()
    const entry = await l.upsert(fixture('a'))
    expect(entry.id).toBe('a')
    expect(entry.title).toBe('Trip a')
    expect(entry.loadedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)

    const list = await l.listEntries()
    expect(list).toHaveLength(1)
    expect(list[0]!.id).toBe('a')

    expect((await l.getEntry('a'))?.id).toBe('a')
    expect(await l.getEntry('missing')).toBeNull()
  })

  it('updates the existing entry on re-upsert (no duplicates)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T10:00:00Z'))
    const l = useTripLocker()
    const first = await l.upsert(fixture('a'))

    vi.setSystemTime(new Date('2026-05-09T11:00:00Z'))
    const second = await l.upsert({ ...fixture('a'), title: 'Trip a (v2)' })

    const list = await l.listEntries()
    expect(list).toHaveLength(1)
    expect(list[0]!.title).toBe('Trip a (v2)')
    expect(second.loadedAt > first.loadedAt).toBe(true)
    vi.useRealTimers()
  })

  it('evicts the oldest entry when adding the 11th', async () => {
    vi.useFakeTimers()
    const l = useTripLocker()
    for (let i = 0; i < MAX_LOCKER_SIZE; i++) {
      vi.setSystemTime(new Date(`2026-05-${String(1 + i).padStart(2, '0')}T10:00:00Z`))
      await l.upsert(fixture(`t${i}`))
    }
    expect((await l.listEntries()).map(e => e.id)).toContain('t0')

    vi.setSystemTime(new Date('2026-06-01T10:00:00Z'))
    await l.upsert(fixture('t10'))
    const list = await l.listEntries()
    expect(list).toHaveLength(MAX_LOCKER_SIZE)
    expect(list.map(e => e.id)).not.toContain('t0')
    expect(list.map(e => e.id)).toContain('t10')
    vi.useRealTimers()
  })

  it('sets and clears the active id', async () => {
    const l = useTripLocker()
    await l.setActiveId('a')
    expect(await l.getActiveId()).toBe('a')
    await l.setActiveId(null)
    expect(await l.getActiveId()).toBeNull()
  })

  it('removing an entry preserves other entries', async () => {
    const l = useTripLocker()
    await l.upsert(fixture('a'))
    await l.upsert(fixture('b'))
    await l.remove('a')
    const list = await l.listEntries()
    expect(list).toHaveLength(1)
    expect(list[0]!.id).toBe('b')
  })

  it('removing the active entry clears the active id', async () => {
    const l = useTripLocker()
    await l.upsert(fixture('a'))
    await l.setActiveId('a')
    await l.remove('a')
    expect(await l.getActiveId()).toBeNull()
  })

  it('removing an unknown id is a no-op', async () => {
    const l = useTripLocker()
    await l.upsert(fixture('a'))
    await l.remove('missing')
    expect((await l.listEntries()).map(e => e.id)).toEqual(['a'])
  })
})
