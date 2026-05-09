<script setup lang="ts">
/**
 * Renders the active trip's days as a collapsible UAccordion. The
 * default-open day is picked once on mount via `pickDefaultOpenDay`:
 *   in-range  → today's day
 *   pre-trip  → day 1
 *   post-trip → none (banner offers "Show full trip")
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/itinerary/spec.md
 */
import type { AccordionItem } from '@nuxt/ui'

import type { DayId } from '~/types/day'

import { pickDefaultOpenDay } from '~/utils/default-day'
import { todayISO } from '~/utils/trip-progress'

const trip = useTrip()

const openDays = ref<string[]>([])
const showAllPost = ref(false)

const sortedDays = computed(() => {
  const t = trip.trip.value
  if (!t) return []
  return [...t.days].sort((a, b) => a.date.localeCompare(b.date))
})

const taxonomySlots = computed(() => {
  const tax = trip.trip.value?.taxonomy
  if (!tax) return []
  return [...tax.slots].sort((a, b) => a.order - b.order)
})

const defaultId = computed<DayId | null>(() => {
  return pickDefaultOpenDay(todayISO(), sortedDays.value)
})

const isPostTrip = computed(() => {
  return sortedDays.value.length > 0 && defaultId.value === null
})

const items = computed<AccordionItem[]>(() => {
  return sortedDays.value.map(d => ({
    value: d.id,
    label: d.id, // overridden by the named slot
  }))
})

watch(
  [defaultId, isPostTrip, showAllPost],
  ([id, post, showAll]) => {
    if (post && !showAll) {
      openDays.value = []
      return
    }
    if (post && showAll) {
      openDays.value = sortedDays.value.map(d => d.id)
      return
    }
    openDays.value = id ? [id] : []
  },
  { immediate: true },
)

function dayById(id: string) {
  return sortedDays.value.find(d => d.id === id)
}
</script>

<template>
  <div>
    <div
      v-if="isPostTrip && !showAllPost"
      class="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-bg-elevated)] p-4 text-sm"
    >
      <p class="font-medium">The trip has ended.</p>
      <p class="mt-1 text-xs text-[color:var(--ui-text-muted)]">
        Days are collapsed. You can still review and edit them.
      </p>
      <UButton
        size="sm"
        color="neutral"
        variant="soft"
        class="mt-3"
        @click="showAllPost = true"
      >
        Show full trip
      </UButton>
    </div>

    <UAccordion
      v-model="openDays"
      type="multiple"
      :items="items"
      :unmount-on-hide="false"
    >
      <template #default="{ item }">
        <DayHeader
          v-if="dayById(item.value!)"
          :day="dayById(item.value!)!"
        />
      </template>

      <template #body="{ item }">
        <div v-if="dayById(item.value!)" class="px-1 pb-2">
          <SlotRow
            v-for="s in taxonomySlots"
            :key="s.id"
            :day="dayById(item.value!)!"
            :slot="s"
          />
        </div>
      </template>
    </UAccordion>
  </div>
</template>
