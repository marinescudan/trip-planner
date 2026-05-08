/**
 * Place types and the closed PlaceType enum.
 *
 * `Slot`, `Zone`, `PriorityTier`, `CostTier`, `Energy`, `WeatherFlag` are
 * lightweight ID aliases (foreign keys into `Taxonomy`). The full taxonomy
 * definitions live in `types/taxonomy.ts`.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/trip-schema/spec.md
 */

import type { ISODate } from './trip'

export type PlaceId = string

/** FK to `taxonomy.slots[].id`. */
export type Slot = string
/** FK to `taxonomy.zones[].id`. */
export type Zone = string | number
/** FK to `taxonomy.priorityTiers[].id`. */
export type PriorityTier = string
/** FK to `taxonomy.costTiers[].id`. */
export type CostTier = string
/** FK to `taxonomy.energy[].id`. */
export type Energy = string
/** FK to `taxonomy.weatherFlags`. */
export type WeatherFlag = string

/** Closed enum of supported place types. */
export type PlaceType =
  | 'monument'
  | 'museum'
  | 'gallery'
  | 'beach'
  | 'food'
  | 'cafe'
  | 'nightlife'
  | 'nature'
  | 'viewpoint'
  | 'hike'
  | 'flea-market'
  | 'artisan-market'
  | 'indoor-market'
  | 'art-walk'
  | 'walk'
  | 'activity'
  | 'wellness'
  | 'flamenco'
  | 'club'
  | 'bar'
  | 'shopping'
  | 'mystic'
  | 'aquarium'
  | 'quirky'
  | 'daytrip'
  | 'logistics'
  | 'transit'

export interface PhotoRef {
  /** Primary image URL. */
  src: string
  /** Accessible description. */
  alt: string
  /** Attribution if applicable. */
  credit?: string
  /** Optional fallback URL if `src` fails to load. */
  fallback?: string
}

export interface Place {
  id: PlaceId
  name: string
  type: PlaceType
  /** FK to `homeBases[].id`. Optional for places not anchored to one stay. */
  homeBase?: string
  /** Free-text neighborhood (e.g. `'Centro'`, `'Pedregalejo'`). */
  area: string
  coords: [lat: number, lng: number]
  /** Absolute URL, typically a Google Maps search link. */
  mapsUrl?: string
  photos: PhotoRef[]
  description: string
  notes?: string
  priority: PriorityTier
  zone: Zone
  cost: CostTier
  /** Approximate visit duration in minutes. */
  duration: number
  validSlots: Slot[]
  /** `null` or omitted = any day in trip. */
  validDays?: ISODate[] | null
  tags: string[]
  /** FKs to other place ids that pair well with this one. */
  pairs?: PlaceId[]
  energy: Energy
  weather?: WeatherFlag
  bookingRequired: boolean
  bookingUrl?: string
  /** Free-text opening hours. */
  openingHours?: string
}
