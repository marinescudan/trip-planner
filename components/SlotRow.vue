<script setup lang="ts">
/**
 * One row per slot inside a day:
 *   [scheduled list] | [suggestions list] (top-5 by default; "Show all (n)")
 *   "🎲 Surprise me"
 *   "N skipped — show" hidden footer
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/itinerary/spec.md
 */
import type { Day } from '~/types/day'
import type { Place } from '~/types/place'
import type { SlotDef } from '~/types/taxonomy'

import { computeSuggestions } from '~/utils/suggestions'

const props = defineProps<{
  day: Day
  slot: SlotDef
}>()

const trip = useTrip()
const filters = useFilters()
const dayPlan = useDayPlan()
const placeState = usePlaceState()

const TOP_N = 5

const showAll = ref(false)
const showHiddenFooter = ref(false)

const taxonomy = computed(() => trip.trip.value?.taxonomy)

const todaysAssignments = computed<Record<string, readonly string[]>>(() => {
  return (
    (dayPlan.assignments.value as Record<string, Record<string, string[]>>)[
      props.day.id
    ] ?? {}
  )
})

const scheduledPlaces = computed<Place[]>(() => {
  const ids = todaysAssignments.value[props.slot.id] ?? []
  const map = trip.placeById.value
  const out: Place[] = []
  for (const id of ids) {
    const p = map.get(id)
    if (p) out.push(p)
  }
  return out
})

/** Filtered candidate set, before slot/day/scheduled-today rules. */
const candidates = computed<Place[]>(() => filters.filteredPlaces.value)

const allSuggestions = computed<Place[]>(() => {
  const tax = taxonomy.value
  if (!tax) return []
  return computeSuggestions({
    day: props.day,
    slot: props.slot.id,
    candidatePlaces: candidates.value,
    todaysAssignments: todaysAssignments.value,
    priorityTiers: tax.priorityTiers,
  })
})

const visibleSuggestions = computed<Place[]>(() => {
  return showAll.value
    ? allSuggestions.value
    : allSuggestions.value.slice(0, TOP_N)
})

/** Skipped places that would otherwise be valid for this slot today. */
const hiddenInSlot = computed<Place[]>(() => {
  const t = trip.trip.value
  if (!t) return []
  const scheduledToday = new Set<string>()
  for (const ids of Object.values(todaysAssignments.value)) {
    for (const id of ids) scheduledToday.add(id)
  }
  return t.places.filter((p) => {
    if (placeState.getState(p.id) !== 'skipped') return false
    if (!p.validSlots.includes(props.slot.id)) return false
    if (p.validDays != null && !p.validDays.includes(props.day.date)) return false
    if (scheduledToday.has(p.id)) return false
    return true
  })
})

function schedule(placeId: string): void {
  dayPlan.assignToSlot(props.day.id, props.slot.id, placeId)
}

function remove(placeId: string): void {
  dayPlan.removeFromSlot(props.day.id, props.slot.id, placeId)
}

function surpriseMe(): void {
  const pool = allSuggestions.value.slice(0, TOP_N)
  if (pool.length === 0) return
  const pick = pool[Math.floor(Math.random() * pool.length)]!
  dayPlan.assignToSlot(props.day.id, props.slot.id, pick.id)
}

function restore(placeId: string): void {
  placeState.setState(placeId, 'untouched')
}
</script>

<template>
  <section class="border-t border-[color:var(--ui-border)] py-3 first:border-t-0">
    <header class="mb-2 flex items-center gap-2">
      <h4 class="text-sm font-semibold uppercase tracking-wide">
        {{ slot.label }}
      </h4>
      <span
        v-if="slot.timeHint"
        class="text-xs text-[color:var(--ui-text-muted)]"
      >
        {{ slot.timeHint }}
      </span>
      <span class="ml-auto text-xs text-[color:var(--ui-text-muted)]">
        {{ scheduledPlaces.length }} scheduled · {{ allSuggestions.length }} match
      </span>
    </header>

    <!-- Scheduled + suggestions, side by side on wide screens; stacked otherwise -->
    <div class="grid gap-3 lg:grid-cols-[minmax(0,_1fr)_auto_minmax(0,_2fr)]">
      <!-- Scheduled ----------------------------------------------------- -->
      <div class="min-w-0">
        <p class="mb-1 text-xs text-[color:var(--ui-text-muted)]">Scheduled</p>
        <SlotScroller
          v-if="scheduledPlaces.length > 0"
          :aria-label="`${slot.label} scheduled`"
        >
          <PlaceCard
            v-for="p in scheduledPlaces"
            :key="p.id"
            :place="p"
            scheduled
            @remove="remove"
          />
        </SlotScroller>
        <p v-else class="text-xs italic text-[color:var(--ui-text-muted)]">
          Nothing scheduled yet.
        </p>
      </div>

      <!-- Divider (desktop only) ---------------------------------------- -->
      <div
        class="hidden lg:block lg:w-px lg:self-stretch lg:bg-[color:var(--ui-border)]"
        aria-hidden="true"
      />

      <!-- Suggestions --------------------------------------------------- -->
      <div class="min-w-0">
        <div class="mb-1 flex items-center gap-2">
          <p class="text-xs text-[color:var(--ui-text-muted)]">Suggestions</p>
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-sparkles"
            :disabled="allSuggestions.length === 0"
            @click="surpriseMe"
          >
            Surprise me
          </UButton>
          <UButton
            v-if="allSuggestions.length > TOP_N"
            size="xs"
            color="neutral"
            variant="link"
            class="ml-auto"
            @click="showAll = !showAll"
          >
            {{ showAll ? 'Show top 5' : `Show all (${allSuggestions.length})` }}
          </UButton>
        </div>
        <SlotScroller
          v-if="visibleSuggestions.length > 0"
          :aria-label="`${slot.label} suggestions`"
        >
          <PlaceCard
            v-for="p in visibleSuggestions"
            :key="p.id"
            :place="p"
            @schedule="schedule"
          />
        </SlotScroller>
        <p
          v-else-if="allSuggestions.length === 0"
          class="text-xs italic text-[color:var(--ui-text-muted)]"
        >
          No suggestions match your filters.
        </p>
      </div>
    </div>

    <!-- Hidden footer -------------------------------------------------- -->
    <div
      v-if="hiddenInSlot.length > 0"
      class="mt-3 border-t border-dashed border-[color:var(--ui-border)] pt-2"
    >
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        :icon="showHiddenFooter ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
        @click="showHiddenFooter = !showHiddenFooter"
      >
        {{ hiddenInSlot.length }} skipped — {{ showHiddenFooter ? 'hide' : 'show' }}
      </UButton>
      <div v-if="showHiddenFooter" class="mt-2">
        <SlotScroller :aria-label="`${slot.label} hidden`">
          <article
            v-for="p in hiddenInSlot"
            :key="p.id"
            class="flex w-56 shrink-0 snap-start flex-col gap-1.5 rounded-lg border border-dashed border-[color:var(--ui-border)] p-3 text-sm opacity-60"
          >
            <p class="truncate font-medium">{{ p.name }}</p>
            <p class="truncate text-xs text-[color:var(--ui-text-muted)]">
              {{ p.area }}
            </p>
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              icon="i-heroicons-arrow-uturn-left"
              class="mt-auto self-end"
              @click="restore(p.id)"
            >
              Restore
            </UButton>
          </article>
        </SlotScroller>
      </div>
    </div>
  </section>
</template>
