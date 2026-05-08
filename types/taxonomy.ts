/**
 * Taxonomy definitions — the controlled vocabularies a trip ships with.
 * Every place + day references these by `id`.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/trip-schema/spec.md
 */

import type { HexColor } from './trip'

export interface SlotDef {
  id: string
  label: string
  icon?: string
  /** Sort order; lower renders earlier in the day. */
  order: number
  /** Free-text time hint, e.g. `'9–12'`. */
  timeHint?: string
}

export interface PriorityTierDef {
  id: string
  label: string
  color: HexColor
  /** Higher weight = higher priority. */
  weight: number
}

export interface CostTierDef {
  id: string
  label: string
  /** UI symbol, e.g. `'€€'` or `'Free'`. */
  symbol: string
  /** Upper bound in trip currency. `null` means no upper bound. */
  max: number | null
}

export interface ZoneDef {
  id: string | number
  label: string
  hint?: string
}

export interface EnergyDef {
  id: string
  label: string
  icon?: string
}

export interface Taxonomy {
  slots: SlotDef[]
  priorityTiers: PriorityTierDef[]
  costTiers: CostTierDef[]
  zones: ZoneDef[]
  energy: EnergyDef[]
  /** Free-vocabulary weather flags referenced by `places[].weather`. */
  weatherFlags?: string[]
}
