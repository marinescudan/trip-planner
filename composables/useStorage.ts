/**
 * Storage adapter foundation + per-key throttled writes + key namespacing
 * helpers (task 4.1).
 *
 * Per CLAUDE.md, NO consumer SHALL touch `localStorage` directly. All
 * persistence flows through `useStorage()` which returns the active
 * `StorageAdapter`. v1 ships exactly one production implementation:
 * `LocalAdapter` (backed by `window.localStorage`). Tests inject
 * `InMemoryAdapter` via `setStorageAdapter()`.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/state/spec.md
 */
import type { z } from 'zod'

export interface StorageAdapter {
  /** Returns parsed+validated value, or `null` if absent / invalid / SSR. */
  get<T>(key: string, schema: z.ZodType<T>): Promise<T | null>
  /** Validates `value` against `schema` then writes serialized JSON. */
  set<T>(key: string, value: T, schema: z.ZodType<T>): Promise<void>
  delete(key: string): Promise<void>
  /** Returns all stored keys starting with `prefix` (no value reads). */
  list(prefix: string): Promise<string[]>
}

/**
 * Default adapter. Reads/writes `window.localStorage` if available; on the
 * server (SSR) every operation is a silent no-op or returns the default
 * (`null` / `[]`). Invalid stored values are silently dropped per the
 * state spec ("Storage hydration").
 */
export class LocalAdapter implements StorageAdapter {
  private storage(): Storage | null {
    if (typeof globalThis === 'undefined') return null
    const win = (globalThis as { window?: { localStorage?: Storage } }).window
    if (win?.localStorage) return win.localStorage
    if (typeof localStorage !== 'undefined') return localStorage
    return null
  }

  async get<T>(key: string, schema: z.ZodType<T>): Promise<T | null> {
    const ls = this.storage()
    if (!ls) return null
    const raw = ls.getItem(key)
    if (raw == null) return null
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return null
    }
    const r = schema.safeParse(parsed)
    return r.success ? r.data : null
  }

  async set<T>(key: string, value: T, schema: z.ZodType<T>): Promise<void> {
    const ls = this.storage()
    if (!ls) return
    schema.parse(value)
    ls.setItem(key, JSON.stringify(value))
  }

  async delete(key: string): Promise<void> {
    const ls = this.storage()
    if (!ls) return
    ls.removeItem(key)
  }

  async list(prefix: string): Promise<string[]> {
    const ls = this.storage()
    if (!ls) return []
    const out: string[] = []
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i)
      if (k != null && k.startsWith(prefix)) out.push(k)
    }
    return out
  }
}

/**
 * Test-only adapter. Stores serialized JSON in a `Map` for fast,
 * deterministic CRUD inside `vitest`. The exposed `reset()` helper makes
 * `beforeEach` cleanup trivial.
 */
export class InMemoryAdapter implements StorageAdapter {
  private map = new Map<string, string>()

  async get<T>(key: string, schema: z.ZodType<T>): Promise<T | null> {
    const raw = this.map.get(key)
    if (raw == null) return null
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return null
    }
    const r = schema.safeParse(parsed)
    return r.success ? r.data : null
  }

  async set<T>(key: string, value: T, schema: z.ZodType<T>): Promise<void> {
    schema.parse(value)
    this.map.set(key, JSON.stringify(value))
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key)
  }

  async list(prefix: string): Promise<string[]> {
    return [...this.map.keys()].filter(k => k.startsWith(prefix))
  }

  /** Test helper. Not part of `StorageAdapter`. */
  reset(): void {
    this.map.clear()
  }
}

let _adapter: StorageAdapter = new LocalAdapter()

/** Swap the active adapter. Used by tests to inject `InMemoryAdapter`. */
export function setStorageAdapter(adapter: StorageAdapter): void {
  // Discard any pending throttled writes — they target the previous adapter
  // and any stale schema closures.
  for (const timer of _pendingTimers.values()) clearTimeout(timer)
  _pendingTimers.clear()
  _pendingValues.clear()
  _adapter = adapter
}

/** Get the currently active adapter. */
export function useStorage(): StorageAdapter {
  return _adapter
}

// --- key namespacing -------------------------------------------------------

/**
 * Per-trip storage namespace fields. Keep in sync with the localStorage
 * schema in specs/state/spec.md.
 */
export type TripStorageField =
  | 'states'
  | 'days'
  | 'filters'
  | 'presetsApplied'
  | 'dayViewMode'

/** Build the namespaced storage key for a per-trip field. */
export function tripKey(tripId: string, field: TripStorageField): string {
  return `trip:${tripId}:${field}`
}

// --- throttled writes ------------------------------------------------------

/** Default throttle window (ms). Spec: writes per key max once per 200ms. */
export const THROTTLE_MS = 200

interface PendingWrite {
  value: unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- erased generic; schema is applied opaquely on flush
  schema: z.ZodType<any>
}

const _pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()
const _pendingValues = new Map<string, PendingWrite>()

/**
 * Trailing-edge throttled write per key. Rapid calls within `delayMs`
 * coalesce into a single flush carrying the latest value, capping disk
 * traffic on rapid state toggles. Validation runs on flush, not on call.
 */
export function throttledWrite<T>(
  key: string,
  value: T,
  schema: z.ZodType<T>,
  delayMs: number = THROTTLE_MS,
): void {
  _pendingValues.set(key, { value, schema })
  if (_pendingTimers.has(key)) return
  const timer = setTimeout(() => {
    _pendingTimers.delete(key)
    const entry = _pendingValues.get(key)
    _pendingValues.delete(key)
    if (entry) void _adapter.set(key, entry.value, entry.schema)
  }, delayMs)
  _pendingTimers.set(key, timer)
}

/**
 * Force-flush every pending throttled write synchronously (timers cancelled,
 * sets awaited). Used by tests, by the export action, and by lifecycle hooks
 * (e.g. before navigation away).
 */
export async function flushThrottledWrites(): Promise<void> {
  const writes: Promise<void>[] = []
  for (const [key, timer] of _pendingTimers) {
    clearTimeout(timer)
    const entry = _pendingValues.get(key)
    if (entry) writes.push(_adapter.set(key, entry.value, entry.schema))
  }
  _pendingTimers.clear()
  _pendingValues.clear()
  await Promise.all(writes)
}
