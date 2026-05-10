/**
 * Trip loader — resolves which trip JSON to render at boot, in priority
 * order:
 *
 *   1. `?trip=<url>` query param   (fetch + validate; clean URL on success)
 *   2. `localStorage[trip:active]` (load cached `sourceJson` from locker)
 *   3. Default `/trip.json`        (same-origin, shipped with the build)
 *   4. Fall through                (`{ ok: false, error: { kind: 'no-trip' } }`)
 *
 * Validation failures at any step return diagnostics; they SHALL NOT
 * silently fall through to a different trip (per trip-loading spec).
 *
 * The loader also exposes `loadFromUrl` and `loadFromText` for the
 * `/load` page. All success paths persist the validated trip into the
 * locker (`upsert` + `setActiveId`) and update `useTrip()`.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/trip-loading/spec.md
 */
import type { LockerSource } from '../types/locker'
import { type TripJson, type ValidationIssue, validateTripJson } from '../utils/schema'
import { useDayPlan } from './useDayPlan'
import { useDayViewMode } from './useDayViewMode'
import { useFilters } from './useFilters'
import { usePlaceState } from './usePlaceState'
import { useTrip } from './useTrip'
import { useTripLocker } from './useTripLocker'

/** Default URL for the bundled trip JSON (same-origin). */
export const DEFAULT_TRIP_URL = '/trip.json'

export type LoaderError =
  | { kind: 'no-trip' }
  | { kind: 'fetch'; status?: number; message: string }
  | { kind: 'parse'; message: string }
  | { kind: 'validation'; issues: ValidationIssue[] }
  | { kind: 'cors'; message: string }

export type LoaderResult =
  | { ok: true; trip: TripJson; source: LockerSource }
  | { ok: false; error: LoaderError }

/** Minimal duck-typed Response so tests can inject simple objects. */
export interface MinimalResponse {
  ok: boolean
  status: number
  text(): Promise<string>
}

export interface LoaderEnv {
  /** Override `fetch` for tests. */
  fetchUrl?: (url: string) => Promise<MinimalResponse>
  /** Returns the value of `?trip=` (or `null`). Override for tests. */
  readQueryUrl?: () => string | null
  /** Override the default trip URL (defaults to `/trip.json`). */
  defaultUrl?: string
}

export interface UseTripLoader {
  resolve(): Promise<LoaderResult>
  loadFromUrl(url: string, source: LockerSource): Promise<LoaderResult>
  loadFromText(text: string, source: LockerSource, sourceUrl?: string): Promise<LoaderResult>
}

export function useTripLoader(env?: LoaderEnv): UseTripLoader {
  const locker = useTripLocker()
  const trip = useTrip()
  const fetchUrl = env?.fetchUrl ?? defaultFetch
  const readQueryUrl = env?.readQueryUrl ?? defaultReadQueryUrl
  const defaultUrl = env?.defaultUrl ?? DEFAULT_TRIP_URL

  async function resolve(): Promise<LoaderResult> {
    // 1. Query param
    const queryUrl = readQueryUrl()
    if (queryUrl) {
      return await loadFromUrl(queryUrl, 'url')
    }

    // 2. Active locker entry
    const activeId = await locker.getActiveId()
    if (activeId) {
      const result = await loadFromLocker(activeId)
      if (result.ok) return result
      // If the active id has no entry we fall through to the default;
      // any other error (parse / validation) is surfaced.
      if (result.error.kind !== 'no-trip') return result
    }

    // 3. Default /trip.json
    return await loadFromUrl(defaultUrl, 'default')
  }

  async function loadFromUrl(
    url: string,
    source: LockerSource,
  ): Promise<LoaderResult> {
    let response: MinimalResponse
    try {
      response = await fetchUrl(url)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      if (/CORS/i.test(message) || /cross.origin/i.test(message)) {
        return { ok: false, error: { kind: 'cors', message } }
      }
      return { ok: false, error: { kind: 'fetch', message } }
    }
    if (!response.ok) {
      return {
        ok: false,
        error: {
          kind: 'fetch',
          status: response.status,
          message: `HTTP ${response.status}`,
        },
      }
    }
    const text = await response.text()
    return await loadFromText(text, source, source === 'url' || source === 'default' ? url : undefined)
  }

  async function loadFromText(
    text: string,
    source: LockerSource,
    sourceUrl?: string,
  ): Promise<LoaderResult> {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      return {
        ok: false,
        error: {
          kind: 'parse',
          message: e instanceof Error ? e.message : 'invalid JSON',
        },
      }
    }
    const v = validateTripJson(parsed)
    if (!v.ok) {
      return { ok: false, error: { kind: 'validation', issues: v.errors } }
    }
    await activate(v.trip, source, sourceUrl, text)
    return { ok: true, trip: v.trip, source }
  }

  async function loadFromLocker(id: string): Promise<LoaderResult> {
    const entry = await locker.getEntry(id)
    if (!entry) return { ok: false, error: { kind: 'no-trip' } }
    let parsed: unknown
    try {
      parsed = JSON.parse(entry.sourceJson)
    } catch (e) {
      return {
        ok: false,
        error: {
          kind: 'parse',
          message: e instanceof Error ? e.message : 'invalid JSON in cached locker entry',
        },
      }
    }
    const v = validateTripJson(parsed)
    if (!v.ok) return { ok: false, error: { kind: 'validation', issues: v.errors } }
    trip.setActiveTrip(v.trip)
    await locker.setActiveId(v.trip.trip.id)
    await hydratePerTripState(v.trip.trip.id)
    return { ok: true, trip: v.trip, source: entry.source }
  }

  async function activate(
    t: TripJson,
    source: LockerSource,
    sourceUrl: string | undefined,
    sourceJson: string,
  ): Promise<void> {
    await locker.upsert({
      id: t.trip.id,
      title: t.trip.title,
      source,
      sourceUrl,
      sourceJson,
    })
    await locker.setActiveId(t.trip.id)
    trip.setActiveTrip(t)
    await hydratePerTripState(t.trip.id)
  }

  /**
   * Hydrate the per-trip composables (place states, day plan, filters) from
   * storage. Must run after `trip.setActiveTrip` so taxonomy-driven filter
   * defaults and place-id pruning have the new trip in context.
   */
  async function hydratePerTripState(tripId: string): Promise<void> {
    await Promise.all([
      usePlaceState().loadForTrip(tripId),
      useDayPlan().loadForTrip(tripId),
      useFilters().loadForTrip(tripId),
      useDayViewMode().loadForTrip(tripId),
    ])
  }

  return { resolve, loadFromUrl, loadFromText }
}

// --- defaults ---------------------------------------------------------------

async function defaultFetch(url: string): Promise<MinimalResponse> {
  return await fetch(url)
}

function defaultReadQueryUrl(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('trip')
}
