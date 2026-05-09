<script setup lang="ts">
/**
 * Minimal placeholder card rendered inside SlotRow for Phase 6.
 * Phase 7 replaces this with `PlaceCard.vue` (hero photo, full state
 * controls, action menu, details modal).
 *
 * Until then the card renders just enough to verify slot ordering,
 * suggestions, scheduling actions, and the dimmed-skipped style.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/itinerary/spec.md (placeholder)
 */
import type { Place } from '~/types/place'

const props = defineProps<{
  place: Place
  /** When true, render as a scheduled card (e.g. with a remove button). */
  scheduled?: boolean
  /** When true, the place is in `skipped` state — render dimmed. */
  hidden?: boolean
}>()

const emit = defineEmits<{
  schedule: [placeId: string]
  remove: [placeId: string]
}>()

const trip = useTrip()

const priorityColor = computed(() => {
  const t = trip.trip.value?.taxonomy.priorityTiers.find(
    p => p.id === props.place.priority,
  )
  return t?.color ?? '#999'
})

const costSymbol = computed(() => {
  const c = trip.trip.value?.taxonomy.costTiers.find(
    t => t.id === props.place.cost,
  )
  return c?.symbol ?? props.place.cost
})

const zoneLabel = computed(() => {
  const z = trip.trip.value?.taxonomy.zones.find(
    zd => zd.id === props.place.zone,
  )
  return z?.label ?? `Zone ${props.place.zone}`
})
</script>

<template>
  <article
    class="flex w-56 shrink-0 snap-start flex-col gap-1.5 rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-bg-elevated)] p-3 text-sm"
    :class="{ 'opacity-50': props.hidden }"
  >
    <div class="flex items-center gap-2">
      <span
        class="size-2 shrink-0 rounded-full"
        :style="{ backgroundColor: priorityColor }"
        aria-hidden="true"
      />
      <p class="truncate font-medium">{{ place.name }}</p>
    </div>
    <p class="truncate text-xs text-[color:var(--ui-text-muted)]">
      {{ place.area }} · {{ zoneLabel }}
    </p>
    <p class="text-xs text-[color:var(--ui-text-muted)]">
      {{ costSymbol }} · {{ place.duration }} min
    </p>
    <div class="mt-auto flex items-center justify-end gap-1 pt-1">
      <UButton
        v-if="!props.scheduled"
        icon="i-heroicons-plus"
        size="xs"
        color="neutral"
        variant="soft"
        aria-label="Schedule"
        @click="emit('schedule', place.id)"
      />
      <UButton
        v-else
        icon="i-heroicons-x-mark"
        size="xs"
        color="neutral"
        variant="ghost"
        aria-label="Remove from slot"
        @click="emit('remove', place.id)"
      />
    </div>
  </article>
</template>
