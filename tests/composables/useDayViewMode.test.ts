import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useDayViewMode } from '../../composables/useDayViewMode'
import {
  flushThrottledWrites,
  InMemoryAdapter,
  setStorageAdapter,
} from '../../composables/useStorage'

describe('useDayViewMode', () => {
  beforeEach(async () => {
    setStorageAdapter(new InMemoryAdapter())
    useDayViewMode().unload()
    await useDayViewMode().loadForTrip('A')
  })
  afterEach(async () => {
    await flushThrottledWrites()
  })

  it('defaults to flat (false) for any day', () => {
    const m = useDayViewMode()
    expect(m.isGrouped('d1')).toBe(false)
    expect(m.isGrouped('whatever')).toBe(false)
  })

  it('setGrouped + isGrouped round-trip', () => {
    const m = useDayViewMode()
    m.setGrouped('d1', true)
    expect(m.isGrouped('d1')).toBe(true)
    m.setGrouped('d1', false)
    expect(m.isGrouped('d1')).toBe(false)
  })

  it('toggle flips the value', () => {
    const m = useDayViewMode()
    m.toggle('d1')
    expect(m.isGrouped('d1')).toBe(true)
    m.toggle('d1')
    expect(m.isGrouped('d1')).toBe(false)
  })

  it('keeps days isolated from each other', () => {
    const m = useDayViewMode()
    m.setGrouped('d1', true)
    expect(m.isGrouped('d1')).toBe(true)
    expect(m.isGrouped('d2')).toBe(false)
  })

  it('persists across reload', async () => {
    const m = useDayViewMode()
    m.setGrouped('d1', true)
    m.setGrouped('d3', true)
    await flushThrottledWrites()

    m.unload()
    await m.loadForTrip('A')
    expect(m.isGrouped('d1')).toBe(true)
    expect(m.isGrouped('d2')).toBe(false)
    expect(m.isGrouped('d3')).toBe(true)
  })

  it('cross-trip isolation', async () => {
    const m = useDayViewMode()
    m.setGrouped('d1', true)
    await flushThrottledWrites()

    await m.loadForTrip('B')
    expect(m.isGrouped('d1')).toBe(false)

    m.setGrouped('d1', true)
    m.setGrouped('d2', true)
    await flushThrottledWrites()

    await m.loadForTrip('A')
    expect(m.isGrouped('d1')).toBe(true)
    expect(m.isGrouped('d2')).toBe(false)
  })
})
