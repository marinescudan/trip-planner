<script setup lang="ts">
/**
 * Kebab menu rendered on every PlaceCard:
 *
 *   ┃ ⋮ ┃ → Open in Maps
 *           Move to slot ▸  Day 1 ▸ Morning
 *                                    Lunch
 *                                    …
 *                          Day 2 ▸ …
 *           Show details
 *
 * "Move to slot" relies on Nuxt UI's nested `DropdownMenuItem.children`
 * support — each day becomes a sub-menu whose leaves call
 * `useDayPlan().assignToSlot()`.
 *
 * The Maps URL builder lives in Phase 8 (`utils/maps.ts`); for now we fall
 * back to `place.mapsUrl` if present, else a Google Maps search by name.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/itinerary/spec.md
 */
import type { DropdownMenuItem } from '@nuxt/ui'

import type { Place } from '~/types/place'

const props = defineProps<{
  place: Place
}>()

const emit = defineEmits<{
  'show-details': []
}>()

const trip = useTrip()
const dayPlan = useDayPlan()

const mapsHref = computed(() => {
  if (props.place.mapsUrl) return props.place.mapsUrl
  const q = encodeURIComponent(`${props.place.name} ${props.place.area}`)
  return `https://www.google.com/maps/search/?api=1&query=${q}`
})

const moveToSlotChildren = computed<DropdownMenuItem[]>(() => {
  const t = trip.trip.value
  if (!t) return []
  const slots = [...t.taxonomy.slots].sort((a, b) => a.order - b.order)
  const days = [...t.days].sort((a, b) => a.date.localeCompare(b.date))

  return days.map<DropdownMenuItem>((d) => {
    return {
      label: `Day ${d.dayNum} · ${d.date}`,
      icon: 'i-heroicons-calendar-days',
      children: slots
        .filter(s => props.place.validSlots.includes(s.id))
        .map<DropdownMenuItem>(s => ({
          label: s.label,
          icon: 'i-heroicons-clock',
          onSelect: () => dayPlan.assignToSlot(d.id, s.id, props.place.id),
        })),
    }
  })
})

const items = computed<DropdownMenuItem[][]>(() => {
  return [
    [
      {
        label: 'Open in Maps',
        icon: 'i-heroicons-map',
        to: mapsHref.value,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
      {
        label: 'Move to slot…',
        icon: 'i-heroicons-arrows-right-left',
        children: moveToSlotChildren.value,
        disabled: moveToSlotChildren.value.length === 0,
      },
    ],
    [
      {
        label: 'Show details',
        icon: 'i-heroicons-information-circle',
        onSelect: () => emit('show-details'),
      },
    ],
  ]
})
</script>

<template>
  <UDropdownMenu :items="items" :ui="{ content: 'min-w-44' }">
    <UButton
      icon="i-heroicons-ellipsis-vertical"
      size="xs"
      color="neutral"
      variant="ghost"
      aria-label="Place actions"
    />
  </UDropdownMenu>
</template>
