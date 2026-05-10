<script setup lang="ts">
/**
 * Default body for a day in the accordion: a single chronological list of
 * scheduled places (slot order, then insertion order within slot) and a
 * single "Suggestions" group capped at the top 8 across the whole day.
 *
 * Slots stay in the data model (they still anchor `validSlots`, ranking,
 * and the route URL) — they're just not surfaced as separate rows in this
 * mode. The "Group by slot" switch in `DayHeader` swaps this for the
 * legacy `SlotRow` loop.
 *
 * Source of truth: flat-list change plan (spec edits queued).
 */
import type { Day } from '~/types/day'
import type { Place, Slot } from '~/types/place'

import { computeFlatDaySuggestions } from '~/utils/suggestions'

const props = defineProps<{
  day: Day
}>()

const trip = useTrip()
const filters = useFilters()
const dayPlan = useDayPlan()

const FLAT_TOP_N = 8

const taxonomy = computed(() => trip.trip.value?.taxonomy)

const todaysAssignments = computed<Record<string, readonly string[]>>(() => {
  return (
    (dayPlan.assignments.value as Record<string, Record<string, string[]>>)[
      props.day.id
    ] ?? {}
  )
})

const scheduledPlaces = computed<Place[]>(() => {
  const ids = dayPlan.flatScheduled(props.day.id)
  const map = trip.placeById.value
  const out: Place[] = []
  for (const id of ids) {
    const p = map.get(id)
    if (p) out.push(p)
  }
  return out
})

const suggestions = computed<Place[]>(() => {
  const tax = taxonomy.value
  if (!tax) return []
  return computeFlatDaySuggestions(
    {
      day: props.day,
      taxonomy: tax,
      candidatePlaces: filters.filteredPlaces.value,
      todaysAssignments: todaysAssignments.value,
      priorityTiers: tax.priorityTiers,
    },
    FLAT_TOP_N,
  )
})

function remove(placeId: string): void {
  // The card doesn't know which slot the place is in — find it.
  const slots = (
    dayPlan.assignments.value as Record<string, Record<string, string[]>>
  )[props.day.id]
  if (!slots) return
  for (const [slotId, ids] of Object.entries(slots)) {
    if (ids.includes(placeId)) {
      dayPlan.removeFromSlot(props.day.id, slotId, placeId)
      return
    }
  }
}

function surpriseMe(): void {
  const pool = suggestions.value
  if (pool.length === 0) return
  const tax = taxonomy.value
  if (!tax) return
  const pick = pool[Math.floor(Math.random() * pool.length)]!
  // Earliest valid slot that exists in taxonomy.slots.
  const slotsAsc = [...tax.slots].sort((a, b) => a.order - b.order)
  const target: Slot | undefined = slotsAsc.find(s =>
    pick.validSlots.includes(s.id),
  )?.id
  if (!target) return
  dayPlan.assignToSlot(props.day.id, target, pick.id)
}
</script>

<template>
  <div class="flex flex-col gap-4 py-2">
    <!-- Scheduled ----------------------------------------------------- -->
    <section v-if="scheduledPlaces.length > 0">
      <header class="mb-2 flex items-center gap-2">
        <h4 class="text-sm font-semibold uppercase tracking-wide">
          Scheduled
        </h4>
        <span class="text-xs text-[color:var(--ui-text-muted)]">
          {{ scheduledPlaces.length }}
        </span>
      </header>
      <SlotScroller :aria-label="`Day ${day.dayNum} scheduled`">
        <PlaceCard
          v-for="p in scheduledPlaces"
          :key="p.id"
          :place="p"
          scheduled
          @remove="remove"
        />
      </SlotScroller>
    </section>

    <!-- Suggestions --------------------------------------------------- -->
    <section>
      <header class="mb-2 flex items-center gap-2">
        <h4 class="text-sm font-semibold uppercase tracking-wide">
          Suggestions
        </h4>
        <span class="text-xs text-[color:var(--ui-text-muted)]">
          {{ suggestions.length }}
        </span>
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-heroicons-sparkles"
          class="ml-auto"
          :disabled="suggestions.length === 0"
          @click="surpriseMe"
        >
          Surprise me 🎲
        </UButton>
      </header>
      <SlotScroller
        v-if="suggestions.length > 0"
        :aria-label="`Day ${day.dayNum} suggestions`"
      >
        <PlaceCard
          v-for="p in suggestions"
          :key="p.id"
          :place="p"
          :day-id="day.id"
        />
      </SlotScroller>
      <p
        v-else-if="scheduledPlaces.length === 0"
        class="text-xs italic text-[color:var(--ui-text-muted)]"
      >
        No suggestions match your filters.
      </p>
    </section>
  </div>
</template>
