<script setup lang="ts">
/**
 * Header rendered inside each day accordion item:
 *   "Day n · weekday, MMM d"  Home-base badge   "5 scheduled"  [Open route]
 *   theme line + fixed-event chips
 *
 * "Open route in Maps" is wired in Phase 8; here it is rendered disabled
 * if no places are scheduled (per spec scenario "Open route with no
 * scheduled places") and otherwise as a stub button (no-op for now).
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/itinerary/spec.md
 */
import type { Day } from '~/types/day'

const props = defineProps<{
  day: Day
}>()

const trip = useTrip()
const dayPlan = useDayPlan()

const homeBaseLabel = computed(() => {
  if (!props.day.homeBase) return null
  return trip.trip.value?.homeBases.find(h => h.id === props.day.homeBase)?.label
    ?? props.day.homeBase
})

const scheduledCount = computed(() => {
  const slots = (dayPlan.assignments.value as Record<string, Record<string, string[]>>)[
    props.day.id
  ]
  if (!slots) return 0
  let n = 0
  for (const ids of Object.values(slots)) n += ids.length
  return n
})

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
</script>

<template>
  <div class="flex w-full items-center gap-3 text-left">
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex items-center gap-2">
        <span class="font-display text-base">Day {{ day.dayNum }}</span>
        <span class="text-xs text-[color:var(--ui-text-muted)]">
          {{ dateLabel }}
        </span>
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
  </div>
</template>
