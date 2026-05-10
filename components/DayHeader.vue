<script setup lang="ts">
/**
 * Header rendered inside each day accordion item:
 *   "Day n · weekday, MMM d"  Home-base badge   "5 scheduled"  [Open route]
 *   theme line + fixed-event chips
 *
 * "Open route in Maps" is wired to `utils/maps.ts → buildDayRouteUrl`.
 * Disabled when 0 places are scheduled (per spec: "Open route with no
 * scheduled places"). Shows a small warning text when the day has more
 * than `MAX_DAY_ROUTE_STOPS` (9) stops since the URL is truncated.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/itinerary/spec.md
 *   openspec/changes/init-trip-planner/specs/map/spec.md
 */
import type { Day } from '~/types/day'
import type { Place } from '~/types/place'

import { MAX_DAY_ROUTE_STOPS, buildDayRouteUrl } from '~/utils/maps'
import { todayISO } from '~/utils/trip-progress'

const props = defineProps<{
  day: Day
}>()

const isToday = computed(() => props.day.date === todayISO())

const trip = useTrip()
const dayPlan = useDayPlan()
const dayViewMode = useDayViewMode()

const grouped = computed<boolean>({
  get: () => dayViewMode.isGrouped(props.day.id),
  set: (on) => dayViewMode.setGrouped(props.day.id, on),
})

const homeBaseLabel = computed(() => {
  if (!props.day.homeBase) return null
  return trip.trip.value?.homeBases.find(h => h.id === props.day.homeBase)?.label
    ?? props.day.homeBase
})

/** Day's slot-ordered scheduled places, used both for the count and the route. */
const scheduledPlaces = computed<Place[]>(() => {
  const t = trip.trip.value
  if (!t) return []
  const slotsAsc = [...t.taxonomy.slots].sort((a, b) => a.order - b.order)
  const slotMap = (dayPlan.assignments.value as Record<string, Record<string, string[]>>)[
    props.day.id
  ]
  if (!slotMap) return []
  const placeMap = trip.placeById.value
  const out: Place[] = []
  for (const s of slotsAsc) {
    const ids = slotMap[s.id] ?? []
    for (const id of ids) {
      const p = placeMap.get(id)
      if (p) out.push(p)
    }
  }
  return out
})

const scheduledCount = computed(() => scheduledPlaces.value.length)

const route = computed(() => buildDayRouteUrl(scheduledPlaces.value, props.day.travelMode))

const dateLabel = computed(() => {
  const d = props.day.date
  const dt = new Date(`${d}T00:00:00`)
  const lang = trip.trip.value?.trip.language ?? 'en'
  return new Intl.DateTimeFormat(lang, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(dt)
})

/** Stop accordion toggle when the user clicks the route button. */
function onRouteClick(e: MouseEvent): void {
  e.stopPropagation()
}
</script>

<template>
  <div
    class="flex w-full items-center gap-3 text-left"
    :data-day-id="day.id"
    :data-today="isToday ? 'true' : undefined"
  >
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex items-center gap-2">
        <span class="font-display text-base">Day {{ day.dayNum }}</span>
        <span class="text-xs text-[color:var(--ui-text-muted)]">
          {{ dateLabel }}
        </span>
        <UBadge
          v-if="isToday"
          color="warning"
          variant="solid"
          size="xs"
        >
          Today
        </UBadge>
        <UBadge
          v-if="homeBaseLabel"
          color="neutral"
          variant="soft"
          size="xs"
        >
          {{ homeBaseLabel }}
        </UBadge>
      </div>
      <p
        v-if="day.theme"
        class="truncate text-xs text-[color:var(--ui-text-muted)]"
      >
        {{ day.theme }}
      </p>
    </div>

    <span class="shrink-0 text-xs text-[color:var(--ui-text-muted)]">
      {{ scheduledCount }} scheduled
    </span>

    <div
      class="flex shrink-0 items-center gap-1.5"
      data-print-hide="true"
      @click.stop
    >
      <span class="hidden text-xs text-[color:var(--ui-text-muted)] lg:inline">
        Slots
      </span>
      <USwitch
        v-model="grouped"
        size="sm"
        aria-label="Group by slot"
      />
    </div>

    <UTooltip
      v-if="scheduledCount === 0"
      text="Schedule at least one place"
      data-print-hide="true"
    >
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-heroicons-map"
        disabled
        aria-label="Open route in Maps (disabled — no places scheduled)"
        @click="onRouteClick"
      >
        Route
      </UButton>
    </UTooltip>
    <UTooltip
      v-else-if="route.truncated"
      :text="`Showing first ${MAX_DAY_ROUTE_STOPS} of ${route.total} stops`"
      data-print-hide="true"
    >
      <UButton
        :to="route.url ?? undefined"
        target="_blank"
        rel="noopener noreferrer"
        size="xs"
        color="neutral"
        variant="soft"
        icon="i-heroicons-map"
        aria-label="Open route in Maps (truncated)"
        @click="onRouteClick"
      >
        Route ⚠
      </UButton>
    </UTooltip>
    <UButton
      v-else
      :to="route.url ?? undefined"
      target="_blank"
      rel="noopener noreferrer"
      size="xs"
      color="neutral"
      variant="soft"
      icon="i-heroicons-map"
      aria-label="Open route in Maps"
      data-print-hide="true"
      @click="onRouteClick"
    >
      Route
    </UButton>
  </div>
</template>
