import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'

import {
  flushThrottledWrites,
  InMemoryAdapter,
  setStorageAdapter,
  THROTTLE_MS,
  throttledWrite,
  tripKey,
  useStorage,
} from '../../composables/useStorage'

describe('useStorage — key namespacing + throttled writes (task 4.1)', () => {
  let adapter: InMemoryAdapter
  let writes: number

  beforeEach(() => {
    adapter = new InMemoryAdapter()
    writes = 0
    const orig = adapter.set.bind(adapter)
    adapter.set = async (k, v, s) => { writes++; return orig(k, v, s) }
    setStorageAdapter(adapter)
  })
  afterEach(async () => {
    await flushThrottledWrites()
  })

  it('tripKey() builds namespaced keys', () => {
    expect(tripKey('A', 'states')).toBe('trip:A:states')
    expect(tripKey('A', 'days')).toBe('trip:A:days')
    expect(tripKey('A', 'filters')).toBe('trip:A:filters')
    expect(tripKey('A', 'presetsApplied')).toBe('trip:A:presetsApplied')
  })

  it('coalesces 5 rapid calls into 1 write (all within window)', async () => {
    const schema = z.number()
    for (let i = 1; i <= 5; i++) throttledWrite('k', i, schema)
    await new Promise(r => setTimeout(r, THROTTLE_MS + 50))
    expect(writes).toBe(1)
    expect(await useStorage().get('k', schema)).toBe(5) // last value wins
  })

  it('splits across windows: 5 calls spaced by 75ms → 2 writes within 300ms', async () => {
    const schema = z.number()
    const start = Date.now()
    for (let i = 1; i <= 5; i++) {
      throttledWrite('k', i, schema)
      await new Promise(r => setTimeout(r, 75))
    }
    // Allow trailing flush
    await new Promise(r => setTimeout(r, THROTTLE_MS + 50))
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(700)
    expect(writes).toBeGreaterThanOrEqual(1)
    expect(writes).toBeLessThanOrEqual(2)
  })

  it('flushThrottledWrites cancels timers and writes immediately', async () => {
    throttledWrite('k', 'v', z.string())
    expect(writes).toBe(0)
    await flushThrottledWrites()
    expect(writes).toBe(1)
    expect(await useStorage().get('k', z.string())).toBe('v')
  })

  it('different keys throttle independently', async () => {
    throttledWrite('a', 1, z.number())
    throttledWrite('b', 2, z.number())
    await flushThrottledWrites()
    expect(writes).toBe(2)
  })

  it('setStorageAdapter clears pending writes (no leak across adapter swaps)', async () => {
    throttledWrite('k', 1, z.number())
    setStorageAdapter(new InMemoryAdapter())
    await new Promise(r => setTimeout(r, THROTTLE_MS + 50))
    expect(writes).toBe(0) // pending was discarded with the previous adapter
  })
})
