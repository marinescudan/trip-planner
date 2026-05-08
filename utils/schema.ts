/**
 * Zod schemas + cross-field validation for Trip JSON v1.0.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/trip-schema/spec.md
 *
 * Zod schemas mirror types in `types/`. Foreign-key checks, ID uniqueness,
 * date-range invariants, and `$schema` major-version compatibility live in
 * the top-level `.superRefine` so a single `.safeParse` returns every issue.
 */
import { z } from 'zod'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const SCHEMA_RE = /^trip-app\/v?(\d+)\.(\d+)\.(\d+)$/

/** Major version this build of the app understands. */
export const APP_SCHEMA_MAJOR = 1

// --- Primitive schemas ------------------------------------------------------

const isoDateSchema = z.string().regex(ISO_DATE_RE, 'expected YYYY-MM-DD date')
const hexColorSchema = z
  .string()
  .regex(HEX_COLOR_RE, 'expected #rgb or #rrggbb hex color')
const coordsSchema = z.tuple([
  z.number().min(-90, 'lat must be ≥ -90').max(90, 'lat must be ≤ 90'),
  z.number().min(-180, 'lng must be ≥ -180').max(180, 'lng must be ≤ 180'),
])
const urlSchema = z.string().url('expected absolute URL')

// --- State -----------------------------------------------------------------

export const placeStateSchema = z.enum([
  'untouched',
  'wishlist',
  'scheduled',
  'done',
  'skipped',
])

// --- Trip metadata ----------------------------------------------------------

export const travelerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  birthdayDuringTrip: isoDateSchema.optional(),
})

export const themeSchema = z.object({
  primary: hexColorSchema.optional(),
  accent: hexColorSchema.optional(),
  bg: hexColorSchema.optional(),
})

export const tripMetaSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  timezone: z.string().min(1),
  currency: z.string().min(1),
  language: z.string().min(1),
  travelers: z.array(travelerSchema).min(1, 'trip must have ≥1 traveler'),
  theme: themeSchema.optional(),
  sync: z.unknown().optional(),
})

// --- HomeBase ---------------------------------------------------------------

export const homeBaseSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  city: z.string().min(1),
  address: z.string().optional(),
  coords: coordsSchema,
  dateRange: z.object({
    from: isoDateSchema,
    to: isoDateSchema,
  }),
  notes: z.string().optional(),
})

// --- Taxonomy ---------------------------------------------------------------

export const slotDefSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  icon: z.string().optional(),
  order: z.number(),
  timeHint: z.string().optional(),
})

export const priorityTierDefSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  color: hexColorSchema,
  weight: z.number(),
})

export const costTierDefSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  symbol: z.string().min(1),
  max: z.number().nullable(),
})

export const zoneDefSchema = z.object({
  id: z.union([z.string().min(1), z.number()]),
  label: z.string().min(1),
  hint: z.string().optional(),
})

export const energyDefSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  icon: z.string().optional(),
})

export const taxonomySchema = z.object({
  slots: z.array(slotDefSchema).min(1),
  priorityTiers: z.array(priorityTierDefSchema).min(1),
  costTiers: z.array(costTierDefSchema).min(1),
  zones: z.array(zoneDefSchema).min(1),
  energy: z.array(energyDefSchema).min(1),
  weatherFlags: z.array(z.string()).optional(),
})

// --- Place ------------------------------------------------------------------

export const placeTypeSchema = z.enum([
  'monument',
  'museum',
  'gallery',
  'beach',
  'food',
  'cafe',
  'nightlife',
  'nature',
  'viewpoint',
  'hike',
  'flea-market',
  'artisan-market',
  'indoor-market',
  'art-walk',
  'walk',
  'activity',
  'wellness',
  'flamenco',
  'club',
  'bar',
  'shopping',
  'mystic',
  'aquarium',
  'quirky',
  'daytrip',
  'logistics',
  'transit',
])

export const photoRefSchema = z.object({
  src: z.string().min(1),
  alt: z.string().min(1),
  credit: z.string().optional(),
  fallback: z.string().optional(),
})

export const placeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: placeTypeSchema,
  homeBase: z.string().optional(),
  area: z.string(),
  coords: coordsSchema,
  mapsUrl: urlSchema.optional(),
  photos: z.array(photoRefSchema).min(1),
  description: z.string(),
  notes: z.string().optional(),
  priority: z.string().min(1),
  zone: z.union([z.string().min(1), z.number()]),
  cost: z.string().min(1),
  duration: z.number().nonnegative(),
  validSlots: z.array(z.string().min(1)),
  validDays: z.array(isoDateSchema).nullable().optional(),
  tags: z.array(z.string()),
  pairs: z.array(z.string()).optional(),
  energy: z.string().min(1),
  weather: z.string().optional(),
  bookingRequired: z.boolean(),
  bookingUrl: urlSchema.optional(),
  openingHours: z.string().optional(),
})

// --- Day --------------------------------------------------------------------

export const fixedEventSchema = z.object({
  name: z.string().min(1),
  time: z.string().optional(),
  type: z.enum(['transit', 'booking', 'event']),
  placeId: z.string().optional(),
  notes: z.string().optional(),
})

export const daySchema = z.object({
  id: z.string().min(1),
  date: isoDateSchema,
  dayNum: z.number().int().positive(),
  homeBase: z.string().optional(),
  theme: z.string(),
  travelMode: z.enum(['walking', 'driving', 'transit', 'mixed']),
  weatherNote: z.string().optional(),
  fixed: z.array(fixedEventSchema).optional(),
})

// --- Presets ----------------------------------------------------------------

export const presetsSchema = z.object({
  states: z.record(z.string(), placeStateSchema).optional(),
  scheduled: z
    .record(z.string(), z.record(z.string(), z.array(z.string())))
    .optional(),
})

// --- Top-level (structural) -------------------------------------------------

export const tripJsonStructuralSchema = z.object({
  $schema: z.string().min(1),
  trip: tripMetaSchema,
  homeBases: z.array(homeBaseSchema).min(1),
  taxonomy: taxonomySchema,
  places: z.array(placeSchema).min(1),
  days: z.array(daySchema).min(1),
  presets: presetsSchema.optional(),
})

// --- Top-level (with cross-field invariants) --------------------------------

export const tripJsonSchema = tripJsonStructuralSchema.superRefine(
  (trip, ctx) => {
    // -- $schema major version ---------------------------------------------
    const m = SCHEMA_RE.exec(trip.$schema)
    if (!m) {
      ctx.addIssue({
        code: 'custom',
        path: ['$schema'],
        message: `expected 'trip-app/<MAJOR>.<MINOR>.<PATCH>', got '${trip.$schema}'`,
      })
    } else {
      const major = Number(m[1])
      if (major !== APP_SCHEMA_MAJOR) {
        ctx.addIssue({
          code: 'custom',
          path: ['$schema'],
          message: `incompatible schema major version: got v${major}, this app supports v${APP_SCHEMA_MAJOR}`,
        })
      }
    }

    // -- trip.endDate ≥ startDate ------------------------------------------
    if (trip.trip.endDate < trip.trip.startDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['trip', 'endDate'],
        message: 'endDate must be ≥ startDate',
      })
    }

    // -- birthdays inside trip range ---------------------------------------
    for (const [i, t] of trip.trip.travelers.entries()) {
      if (t.birthdayDuringTrip == null) continue
      if (
        t.birthdayDuringTrip < trip.trip.startDate ||
        t.birthdayDuringTrip > trip.trip.endDate
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['trip', 'travelers', i, 'birthdayDuringTrip'],
          message: `birthday ${t.birthdayDuringTrip} is outside trip range ${trip.trip.startDate}..${trip.trip.endDate}`,
        })
      }
    }

    // -- ID uniqueness within each array -----------------------------------
    const homeBaseIds = new Set<string>()
    for (const [i, hb] of trip.homeBases.entries()) {
      if (homeBaseIds.has(hb.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['homeBases', i, 'id'],
          message: `duplicate homeBase id: '${hb.id}'`,
        })
      }
      homeBaseIds.add(hb.id)
    }
    const placeIds = new Set<string>()
    for (const [i, p] of trip.places.entries()) {
      if (placeIds.has(p.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['places', i, 'id'],
          message: `duplicate place id: '${p.id}'`,
        })
      }
      placeIds.add(p.id)
    }
    const dayIds = new Set<string>()
    for (const [i, d] of trip.days.entries()) {
      if (dayIds.has(d.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['days', i, 'id'],
          message: `duplicate day id: '${d.id}'`,
        })
      }
      dayIds.add(d.id)
    }

    // -- Taxonomy lookup sets ---------------------------------------------
    const slotIds = new Set(trip.taxonomy.slots.map(s => s.id))
    const priorityIds = new Set(trip.taxonomy.priorityTiers.map(p => p.id))
    const costIds = new Set(trip.taxonomy.costTiers.map(c => c.id))
    const zoneIds = new Set<string | number>(
      trip.taxonomy.zones.map(zd => zd.id),
    )
    const energyIds = new Set(trip.taxonomy.energy.map(e => e.id))
    const weatherIds = new Set(trip.taxonomy.weatherFlags ?? [])

    // -- Place foreign keys ------------------------------------------------
    for (const [i, p] of trip.places.entries()) {
      if (p.homeBase != null && !homeBaseIds.has(p.homeBase)) {
        ctx.addIssue({
          code: 'custom',
          path: ['places', i, 'homeBase'],
          message: `unknown homeBase '${p.homeBase}' on place '${p.id}'`,
        })
      }
      if (!priorityIds.has(p.priority)) {
        ctx.addIssue({
          code: 'custom',
          path: ['places', i, 'priority'],
          message: `unknown priority tier '${p.priority}' on place '${p.id}'`,
        })
      }
      if (!zoneIds.has(p.zone)) {
        ctx.addIssue({
          code: 'custom',
          path: ['places', i, 'zone'],
          message: `unknown zone '${String(p.zone)}' on place '${p.id}'`,
        })
      }
      if (!costIds.has(p.cost)) {
        ctx.addIssue({
          code: 'custom',
          path: ['places', i, 'cost'],
          message: `unknown cost tier '${p.cost}' on place '${p.id}'`,
        })
      }
      if (!energyIds.has(p.energy)) {
        ctx.addIssue({
          code: 'custom',
          path: ['places', i, 'energy'],
          message: `unknown energy '${p.energy}' on place '${p.id}'`,
        })
      }
      if (
        p.weather != null &&
        weatherIds.size > 0 &&
        !weatherIds.has(p.weather)
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['places', i, 'weather'],
          message: `unknown weather flag '${p.weather}' on place '${p.id}'`,
        })
      }
      for (const [j, s] of p.validSlots.entries()) {
        if (!slotIds.has(s)) {
          ctx.addIssue({
            code: 'custom',
            path: ['places', i, 'validSlots', j],
            message: `unknown slot '${s}' on place '${p.id}'`,
          })
        }
      }
      if (p.pairs) {
        for (const [j, pid] of p.pairs.entries()) {
          if (!placeIds.has(pid)) {
            ctx.addIssue({
              code: 'custom',
              path: ['places', i, 'pairs', j],
              message: `unknown place id '${pid}' in pairs of '${p.id}'`,
            })
          }
        }
      }
    }

    // -- Day foreign keys + consecutive dates ------------------------------
    for (const [i, d] of trip.days.entries()) {
      if (d.homeBase != null && !homeBaseIds.has(d.homeBase)) {
        ctx.addIssue({
          code: 'custom',
          path: ['days', i, 'homeBase'],
          message: `unknown homeBase '${d.homeBase}' on day '${d.id}'`,
        })
      }
      if (d.fixed) {
        for (const [j, ev] of d.fixed.entries()) {
          if (ev.placeId != null && !placeIds.has(ev.placeId)) {
            ctx.addIssue({
              code: 'custom',
              path: ['days', i, 'fixed', j, 'placeId'],
              message: `unknown place '${ev.placeId}' in fixed event on day '${d.id}'`,
            })
          }
        }
      }
    }
    const expectedDates = enumerateDays(
      trip.trip.startDate,
      trip.trip.endDate,
    )
    const len = Math.max(expectedDates.length, trip.days.length)
    for (let i = 0; i < len; i++) {
      const expected = expectedDates[i]
      const actual = trip.days[i]?.date
      if (expected !== actual) {
        ctx.addIssue({
          code: 'custom',
          path: ['days', i, 'date'],
          message: `expected ${expected ?? '<no day>'} (consecutive), got ${actual ?? '<missing>'}`,
        })
      }
    }

    // -- Presets references ------------------------------------------------
    if (trip.presets) {
      if (trip.presets.states) {
        for (const pid of Object.keys(trip.presets.states)) {
          if (!placeIds.has(pid)) {
            ctx.addIssue({
              code: 'custom',
              path: ['presets', 'states', pid],
              message: `unknown place id '${pid}' in presets.states`,
            })
          }
        }
      }
      if (trip.presets.scheduled) {
        for (const [dayId, slots] of Object.entries(trip.presets.scheduled)) {
          if (!dayIds.has(dayId)) {
            ctx.addIssue({
              code: 'custom',
              path: ['presets', 'scheduled', dayId],
              message: `unknown day id '${dayId}' in presets.scheduled`,
            })
          }
          for (const [slotId, pids] of Object.entries(slots)) {
            if (!slotIds.has(slotId)) {
              ctx.addIssue({
                code: 'custom',
                path: ['presets', 'scheduled', dayId, slotId],
                message: `unknown slot '${slotId}' in presets.scheduled[${dayId}]`,
              })
            }
            for (const [k, pid] of pids.entries()) {
              if (!placeIds.has(pid)) {
                ctx.addIssue({
                  code: 'custom',
                  path: ['presets', 'scheduled', dayId, slotId, k],
                  message: `unknown place '${pid}' in presets.scheduled[${dayId}][${slotId}]`,
                })
              }
            }
          }
        }
      }
    }
  },
)

// --- Inferred types ---------------------------------------------------------

/** Inferred type matching `tripJsonSchema` output (post-validation). */
export type TripJson = z.infer<typeof tripJsonSchema>
/** Re-export of Zod's issue type for callers that want to render errors. */
export type ValidationIssue = z.ZodIssue

// --- Public entry point -----------------------------------------------------

export type ValidationOk = { ok: true; trip: TripJson }
export type ValidationErr = { ok: false; errors: ValidationIssue[] }

/**
 * Validate an unknown JSON-shaped value against the Trip JSON v1.0 schema
 * (structural + cross-field). On success returns the typed trip; on failure
 * returns the full list of issues so callers can render them.
 */
export function validateTripJson(input: unknown): ValidationOk | ValidationErr {
  const result = tripJsonSchema.safeParse(input)
  if (result.success) return { ok: true, trip: result.data }
  return { ok: false, errors: result.error.issues }
}

// --- Helpers ----------------------------------------------------------------

/** Inclusive list of YYYY-MM-DD strings from `start` to `end` (UTC-safe). */
function enumerateDays(start: string, end: string): string[] {
  const out: string[] = []
  const s = new Date(`${start}T00:00:00Z`)
  const e = new Date(`${end}T00:00:00Z`)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return out
  for (
    const d = new Date(s);
    d.getTime() <= e.getTime();
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const yyyy = d.getUTCFullYear()
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(d.getUTCDate()).padStart(2, '0')
    out.push(`${yyyy}-${mm}-${dd}`)
  }
  return out
}
