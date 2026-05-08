import { beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'

import {
  InMemoryAdapter,
  setStorageAdapter,
  useStorage,
} from '../../composables/useStorage'

describe('useStorage / InMemoryAdapter', () => {
  let adapter: InMemoryAdapter

  beforeEach(() => {
    adapter = new InMemoryAdapter()
    setStorageAdapter(adapter)
  })

  it('returns null for unknown keys', async () => {
    const v = await useStorage().get('missing', z.string())
    expect(v).toBeNull()
  })

  it('round-trips a value through Zod', async () => {
    const schema = z.object({ a: z.number(), b: z.string() })
    await useStorage().set('k1', { a: 1, b: 'x' }, schema)
    const v = await useStorage().get('k1', schema)
    expect(v).toEqual({ a: 1, b: 'x' })
  })

  it('drops invalid stored values silently', async () => {
    // Bypass the public API to plant a bad value.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only access to plant invalid raw bytes
    ;(adapter as any).map.set('k', JSON.stringify({ wrong: true }))
    const v = await useStorage().get('k', z.object({ a: z.number() }))
    expect(v).toBeNull()
  })

  it('drops corrupted JSON silently', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only access to plant invalid raw bytes
    ;(adapter as any).map.set('k', '{ not json')
    const v = await useStorage().get('k', z.string())
    expect(v).toBeNull()
  })

  it('lists keys by prefix', async () => {
    await useStorage().set('trip:a:x', 1, z.number())
    await useStorage().set('trip:a:y', 2, z.number())
    await useStorage().set('trip:b:x', 3, z.number())
    const keys = await useStorage().list('trip:a:')
    expect(keys.sort()).toEqual(['trip:a:x', 'trip:a:y'])
  })

  it('deletes a key', async () => {
    await useStorage().set('k', 'v', z.string())
    await useStorage().delete('k')
    expect(await useStorage().get('k', z.string())).toBeNull()
  })

  it('refuses to write a value that fails its schema', async () => {
    await expect(
      useStorage().set('k', 'not a number' as unknown as number, z.number()),
    ).rejects.toBeDefined()
  })
})
