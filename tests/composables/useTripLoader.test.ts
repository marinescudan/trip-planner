import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  InMemoryAdapter,
  setStorageAdapter,
} from '../../composables/useStorage'
import { useTrip } from '../../composables/useTrip'
import { useTripLocker } from '../../composables/useTripLocker'
import {
  type LoaderEnv,
  type LoaderResult,
  type MinimalResponse,
  useTripLoader,
} from '../../composables/useTripLoader'

// --- helpers ---------------------------------------------------------------

const validFixture = {
  $schema: 'trip-app/v1.0.0',
  trip: {
    id: 'fixture',
    title: 'Fixture',
    startDate: '2026-01-01',
    endDate: '2026-01-02',
    timezone: 'Europe/Madrid',
    currency: 'EUR',
    language: 'en',
    travelers: [{ id: 'a', name: 'A' }],
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
    priorityTiers: [{ id: 'must', label: 'M', color: '#ef4444', weight: 4 }],
    costTiers: [{ id: 'free', label: 'Free', symbol: 'Free', max: 0 }],
    zones: [{ id: 1, label: 'Z1' }],
    energy: [{ id: 'light', label: 'L' }],
  },
  places: [
    {
      id: 'p1',
      name: 'P1',
      type: 'monument',
      area: 'a',
      coords: [40, -3],
      photos: [{ src: 'https://example.com/x.jpg', alt: 'x' }],
      description: '',
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
    { id: 'd1', date: '2026-01-01', dayNum: 1, theme: '', travelMode: 'walking' },
    { id: 'd2', date: '2026-01-02', dayNum: 2, theme: '', travelMode: 'walking' },
  ],
}

const validJson = JSON.stringify(validFixture)
const invalidValidationJson = JSON.stringify({ ...validFixture, places: [] })

function response(body: string, status = 200): MinimalResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  }
}

function envFor(opts: {
  fetches?: Record<string, MinimalResponse | Error>
  query?: string | null
}): LoaderEnv {
  return {
    fetchUrl: async url => {
      const v = opts.fetches?.[url]
      if (v == null) throw new Error(`unmocked fetch: ${url}`)
      if (v instanceof Error) throw v
      return v
    },
    readQueryUrl: () => opts.query ?? null,
    defaultUrl: '/trip.json',
  }
}

// --- tests ----------------------------------------------------------------

describe('useTripLoader.resolve()', () => {
  beforeEach(() => {
    setStorageAdapter(new InMemoryAdapter())
    useTrip().setActiveTrip(null)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('priority 1: query param wins over locker + default', async () => {
    const locker = useTripLocker()
    await locker.upsert({
      id: 'fixture',
      title: 'old',
      source: 'default',
      sourceJson: validJson,
    })
    await locker.setActiveId('fixture')

    const env = envFor({
      query: 'https://example.com/other.json',
      fetches: {
        'https://example.com/other.json': response(validJson),
      },
    })
    const r = await useTripLoader(env).resolve()
    expectOk(r)
    expect(r.source).toBe('url')
  })

  it('priority 2: locker entry used when no query param', async () => {
    const locker = useTripLocker()
    await locker.upsert({
      id: 'fixture',
      title: 'cached',
      source: 'url',
      sourceUrl: 'https://example.com/foo.json',
      sourceJson: validJson,
    })
    await locker.setActiveId('fixture')

    const env = envFor({ query: null, fetches: {} })
    const r = await useTripLoader(env).resolve()
    expectOk(r)
    expect(r.source).toBe('url')
    expect(useTrip().trip.value?.trip.id).toBe('fixture')
  })

  it('priority 3: falls through to /trip.json when locker is empty', async () => {
    const env = envFor({
      query: null,
      fetches: { '/trip.json': response(validJson) },
    })
    const r = await useTripLoader(env).resolve()
    expectOk(r)
    expect(r.source).toBe('default')
    expect(useTripLocker().getActiveId()).resolves.toBe('fixture')
  })

  it('priority 4: returns no-trip when even /trip.json is missing', async () => {
    const env = envFor({
      query: null,
      fetches: { '/trip.json': response('', 404) },
    })
    const r = await useTripLoader(env).resolve()
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.kind).toBe('fetch')
      if (r.error.kind === 'fetch') expect(r.error.status).toBe(404)
    }
  })

  it('reports parse errors instead of falling through', async () => {
    const env = envFor({
      query: null,
      fetches: { '/trip.json': response('{ invalid', 200) },
    })
    const r = await useTripLoader(env).resolve()
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.kind).toBe('parse')
  })

  it('reports validation errors with issues', async () => {
    const env = envFor({
      query: null,
      fetches: { '/trip.json': response(invalidValidationJson, 200) },
    })
    const r = await useTripLoader(env).resolve()
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.kind).toBe('validation')
      if (r.error.kind === 'validation') {
        expect(r.error.issues.length).toBeGreaterThan(0)
      }
    }
  })

  it('classifies CORS-like fetch failures', async () => {
    const env = envFor({
      query: 'https://blocked.example/trip.json',
      fetches: {
        'https://blocked.example/trip.json': new Error(
          'Failed to fetch (CORS denied)',
        ),
      },
    })
    const r = await useTripLoader(env).resolve()
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.kind).toBe('cors')
  })

  it('falls through to /trip.json when active id has no locker entry', async () => {
    const locker = useTripLocker()
    await locker.setActiveId('orphan-id')
    const env = envFor({
      query: null,
      fetches: { '/trip.json': response(validJson) },
    })
    const r = await useTripLoader(env).resolve()
    expectOk(r)
    expect(r.source).toBe('default')
  })

  it('persists active trip into locker on successful fetch', async () => {
    const env = envFor({
      query: null,
      fetches: { '/trip.json': response(validJson) },
    })
    await useTripLoader(env).resolve()
    const entries = await useTripLocker().listEntries()
    expect(entries.map(e => e.id)).toEqual(['fixture'])
    expect(entries[0]!.source).toBe('default')
    expect(await useTripLocker().getActiveId()).toBe('fixture')
  })
})

describe('useTripLoader.loadFromText()', () => {
  beforeEach(() => {
    setStorageAdapter(new InMemoryAdapter())
    useTrip().setActiveTrip(null)
  })

  it('accepts raw paste of valid JSON', async () => {
    const r = await useTripLoader().loadFromText(validJson, 'paste')
    expectOk(r)
    expect(r.source).toBe('paste')
  })

  it('rejects malformed JSON with a parse error', async () => {
    const r = await useTripLoader().loadFromText('{ not json', 'paste')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.kind).toBe('parse')
  })

  it('rejects schema-invalid JSON with validation issues', async () => {
    const r = await useTripLoader().loadFromText(invalidValidationJson, 'paste')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.kind).toBe('validation')
      if (r.error.kind === 'validation') {
        expect(r.error.issues.length).toBeGreaterThan(0)
      }
    }
  })
})

function expectOk(r: LoaderResult): asserts r is LoaderResult & { ok: true } {
  if (!r.ok) {
    throw new Error(
      `expected ok result, got ${r.error.kind}: ${
        'message' in r.error ? r.error.message : JSON.stringify(r.error)
      }`,
    )
  }
}
