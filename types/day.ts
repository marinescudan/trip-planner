/**
 * Day, fixed-event, and travel-mode types.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/trip-schema/spec.md
 */

import type { ISODate } from './trip'
import type { PlaceId } from './place'

export type DayId = string

export type TravelMode = 'walking' | 'driving' | 'transit' | 'mixed'

export type FixedEventType = 'transit' | 'booking' | 'event'

export interface FixedEvent {
  name: string
  /** Free-text time hint, e.g. `'09:00'` or `'morning'`. */
  time?: string
  type: FixedEventType
  /** FK to `places[].id`, when the event is anchored to one. */
  placeId?: PlaceId
  notes?: string
}

export interface Day {
  id: DayId
  /** Calendar date, must fall within `trip.startDate`..`trip.endDate`. */
  date: ISODate
  /** 1-based day number. */
  dayNum: number
  /** FK to `homeBases[].id`. Omitted on transit/gap days. */
  homeBase?: string
  theme: string
  travelMode: TravelMode
  weatherNote?: string
  fixed?: FixedEvent[]
}
