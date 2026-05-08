/**
 * Trip locker — list / save / select / remove the saved trips that
 * `localStorage[trip:locker]` holds. Up to 10 entries; the 11th evicts
 * the oldest by `loadedAt`. The active trip id lives at
 * `localStorage[trip:active]`.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/trip-loading/spec.md
 *   openspec/changes/init-trip-planner/specs/state/spec.md
 */
import { z } from 'zod'

import type { LockerEntry, LockerSource } from '../types/locker'
import { useStorage } from './useStorage'

const LOCKER_KEY = 'trip:locker'
const ACTIVE_KEY = 'trip:active'

/** Spec: "The locker SHALL hold up to 10 entries". */
export const MAX_LOCKER_SIZE = 10

const lockerSourceSchema: z.ZodType<LockerSource> = z.enum([
  'default',
  'url',
  'upload',
  'paste',
])

const lockerEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  source: lockerSourceSchema,
  sourceUrl: z.string().optional(),
  sourceJson: z.string().min(1),
  loadedAt: z.string().min(1),
})

const lockerSchema = z.array(lockerEntrySchema)
const activeIdSchema = z.string().min(1)

export interface UpsertInput {
  id: string
  title: string
  source: LockerSource
  sourceUrl?: string
  sourceJson: string
}

export interface UseTripLocker {
  listEntries(): Promise<LockerEntry[]>
  getEntry(id: string): Promise<LockerEntry | null>
  getActiveId(): Promise<string | null>
  setActiveId(id: string | null): Promise<void>
  upsert(input: UpsertInput): Promise<LockerEntry>
  remove(id: string): Promise<void>
}

export function useTripLocker(): UseTripLocker {
  const adapter = useStorage()

  async function listEntries(): Promise<LockerEntry[]> {
    return (await adapter.get(LOCKER_KEY, lockerSchema)) ?? []
  }

  async function getEntry(id: string): Promise<LockerEntry | null> {
    const entries = await listEntries()
    return entries.find(e => e.id === id) ?? null
  }

  async function getActiveId(): Promise<string | null> {
    return await adapter.get(ACTIVE_KEY, activeIdSchema)
  }

  async function setActiveId(id: string | null): Promise<void> {
    if (id == null) {
      await adapter.delete(ACTIVE_KEY)
      return
    }
    await adapter.set(ACTIVE_KEY, id, activeIdSchema)
  }

  async function upsert(input: UpsertInput): Promise<LockerEntry> {
    const entries = await listEntries()
    const next: LockerEntry = {
      id: input.id,
      title: input.title,
      source: input.source,
      sourceUrl: input.sourceUrl,
      sourceJson: input.sourceJson,
      loadedAt: new Date().toISOString(),
    }
    const idx = entries.findIndex(e => e.id === input.id)
    if (idx >= 0) {
      entries[idx] = next
    } else {
      entries.push(next)
      // Spec: "Adding the 11th evicts the least-recently-active."
      // We use `loadedAt` as the proxy for activity.
      while (entries.length > MAX_LOCKER_SIZE) {
        let oldestIdx = 0
        for (let i = 1; i < entries.length; i++) {
          if (entries[i]!.loadedAt < entries[oldestIdx]!.loadedAt) {
            oldestIdx = i
          }
        }
        entries.splice(oldestIdx, 1)
      }
    }
    await adapter.set(LOCKER_KEY, entries, lockerSchema)
    return next
  }

  async function remove(id: string): Promise<void> {
    const entries = await listEntries()
    const filtered = entries.filter(e => e.id !== id)
    if (filtered.length === entries.length) return
    if (filtered.length === 0) {
      await adapter.delete(LOCKER_KEY)
    } else {
      await adapter.set(LOCKER_KEY, filtered, lockerSchema)
    }
    const active = await getActiveId()
    if (active === id) {
      await setActiveId(null)
    }
  }

  return { listEntries, getEntry, getActiveId, setActiveId, upsert, remove }
}
