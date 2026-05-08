/**
 * Trip metadata, travelers, theme, and home-base types.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/trip-schema/spec.md
 */

/** ISO 8601 calendar date, e.g. `'2026-05-12'`. */
export type ISODate = string
/** IANA timezone identifier, e.g. `'Europe/Madrid'`. */
export type IANATimezone = string
/** ISO 4217 currency code, e.g. `'EUR'`. */
export type ISO4217 = string
/** BCP 47 language tag, e.g. `'en'`, `'ro'`. */
export type BCP47 = string
/** Hex color string, e.g. `'#0ea5e9'` or `'#abc'`. */
export type HexColor = string

export interface Traveler {
  id: string
  name: string
  birthdayDuringTrip?: ISODate
}

export interface Theme {
  primary?: HexColor
  accent?: HexColor
  bg?: HexColor
}

export interface Trip {
  id: string
  title: string
  subtitle?: string
  description?: string
  startDate: ISODate
  endDate: ISODate
  timezone: IANATimezone
  currency: ISO4217
  language: BCP47
  travelers: Traveler[]
  theme?: Theme
  /**
   * Forward-compat: future cloud-sync config. v1 ignores this entirely
   * (LocalAdapter is always used). See state spec.
   */
  sync?: unknown
}

export interface HomeBaseDateRange {
  from: ISODate
  to: ISODate
}

export interface HomeBase {
  id: string
  label: string
  city: string
  address?: string
  coords: [lat: number, lng: number]
  dateRange: HomeBaseDateRange
  notes?: string
}
