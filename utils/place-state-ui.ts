/**
 * Presentation metadata for the five place states. Centralised so
 * `StateButton` and any future status indicators stay in sync.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/state/spec.md
 */
import type { PlaceState } from '../types/state'

export interface PlaceStateUI {
  label: string
  icon: string
  /** Tailwind-friendly color class fragment (e.g. for tinted icon). */
  tone: 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'error'
}

export const PLACE_STATE_UI: Record<PlaceState, PlaceStateUI> = {
  untouched: { label: 'Untouched', icon: 'i-lucide-circle', tone: 'neutral' },
  wishlist: { label: 'Wishlist', icon: 'i-heroicons-bookmark', tone: 'info' },
  scheduled: { label: 'Scheduled', icon: 'i-heroicons-calendar-days', tone: 'primary' },
  done: { label: 'Done', icon: 'i-heroicons-check-circle', tone: 'success' },
  skipped: { label: 'Skipped', icon: 'i-heroicons-x-circle', tone: 'error' },
}
