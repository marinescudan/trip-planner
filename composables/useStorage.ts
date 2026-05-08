/**
 * Storage adapter foundation.
 *
 * Per CLAUDE.md, NO consumer SHALL touch `localStorage` directly. All
 * persistence flows through `useStorage()` which returns the active
 * `StorageAdapter`. v1 ships exactly one production implementation:
 * `LocalAdapter` (backed by `window.localStorage`). Tests inject
 * `InMemoryAdapter` via `setStorageAdapter()`.
 *
 * Note: tasks.md lists a more featureful `useStorage` at task 4.1
 * (throttled writes etc.). The interface + LocalAdapter foundation is
 * pulled forward into Phase 3 because Phase 3 composables persist data
 * and cannot violate the "never use localStorage directly" rule. Phase 4
 * adds throttling on top of this same module.
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
  _adapter = adapter
}

/** Get the currently active adapter. */
export function useStorage(): StorageAdapter {
  return _adapter
}
