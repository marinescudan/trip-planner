/**
 * Filter UI state. Persisted under `trip:<id>:filters`.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/filters/spec.md
 */

import type { CostTier, PriorityTier, Zone } from './place'

export interface FilterState {
  /** Selected priority-tier ids. Default: every tier from `taxonomy.priorityTiers[]`. */
  priorityTiers: PriorityTier[]
  /** Selected zone ids. Default: every zone from `taxonomy.zones[]`. */
  zones: Zone[]
  /** Selected cost-tier ids. Default: every cost from `taxonomy.costTiers[]`. */
  costTiers: CostTier[]
  /** Selected tag chips. Default: empty (= no tag filter). */
  tags: string[]
  /** When true, AND across selected tags; otherwise OR. Default: false. */
  tagsAndMode: boolean
  /** Free-text search across name/area/tags. Default: ''. */
  search: string
  /** When true, include skipped places in suggestions. Default: false. */
  showHidden: boolean
}
