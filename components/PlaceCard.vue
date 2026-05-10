<script setup lang="ts">
/**
 * Rich card rendered inside a slot.
 *
 * Replaces the Phase-6 `SlotPlaceCard` placeholder. Mirrors its prop / event
 * surface (`scheduled`, `hidden`; `schedule`, `remove`) so `SlotRow` only has
 * to swap the component name.
 *
 * Layout:
 *   ┌───────────────────────────────┐
 *   │ hero photo (lazy)             │
 *   ├───────────────────────────────┤
 *   │ ● name                  ⋮ btn │
 *   │ area · zone badge             │
 *   │ €€ · 90 min                   │
 *   │ #tag #tag #tag                │
 *   ├───────────────────────────────┤
 *   │ [State] [+|x]                 │
 *   └───────────────────────────────┘
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/itinerary/spec.md (Place card in slot)
 */
import type { DayId } from '~/types/day'
import type { Place, Slot } from '~/types/place'
import { proximityLabel } from '~/utils/zones'

const props = defineProps<{
  place: Place
  /** When true, render with a "remove from slot" button instead of "schedule". */
  scheduled?: boolean
  /** When true, the place is in `skipped` state — render dimmed. */
  hidden?: boolean
  /**
   * When set on an unscheduled card, the action footer renders an
   * `AddToSlotMenu` that assigns the place directly via `useDayPlan()`.
   * When omitted, the card emits `schedule` and the parent handles it.
   */
  dayId?: DayId
}>()

const emit = defineEmits<{
  schedule: [placeId: string]
  remove: [placeId: string]
}>()

const trip = useTrip()
const placeState = usePlaceState()

const detailsOpen = ref(false)

const priorityColor = computed(() => {
  return trip.trip.value?.taxonomy.priorityTiers.find(
    p => p.id === props.place.priority,
  )?.color ?? '#999'
})

/**
 * Per-spec visual encoding (ux-design "Place card visual hierarchy"):
 *
 *   | State     | Card opacity | Border                                        |
 *   |-----------|--------------|-----------------------------------------------|
 *   | untouched | 100%         | none (only the article default)               |
 *   | wishlist  | 100%         | none                                          |
 *   | scheduled | 100%         | 2px solid var(--color-state-scheduled)        |
 *   | done      | 70%          | 2px dashed var(--color-state-done)            |
 *   | skipped   | 50% (hidden) | none — only via `props.hidden`                |
 *
 * The state icon itself is owned by `<StateButton>` so we don't duplicate
 * it here.
 */
const currentState = computed(() => placeState.getState(props.place.id))

const stateBorderStyle = computed<Record<string, string> | null>(() => {
  switch (currentState.value) {
    case 'scheduled':
      return { border: '2px solid var(--color-state-scheduled)' }
    case 'done':
      return { border: '2px dashed var(--color-state-done)' }
    default:
      return null
  }
})

const stateOpacityClass = computed(() => {
  if (props.hidden) return 'opacity-50'
  if (currentState.value === 'done') return 'opacity-70'
  return ''
})

const costSymbol = computed(() => {
  return trip.trip.value?.taxonomy.costTiers.find(
    t => t.id === props.place.cost,
  )?.symbol ?? props.place.cost
})

const heroPhoto = computed(() => props.place.photos[0] ?? null)
const visibleTags = computed(() => props.place.tags.slice(0, 3))

const proximity = computed(() => {
  const t = trip.trip.value
  if (!t) return ''
  return proximityLabel(props.place, t)
})

const dayPlan = useDayPlan()

function openDetails(): void {
  detailsOpen.value = true
}

function onAddToSlot(slotId: Slot): void {
  if (!props.dayId) return
  dayPlan.assignToSlot(props.dayId, slotId, props.place.id)
}

function onCardKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    openDetails()
  }
}
</script>

<template>
  <article
    class="flex w-60 shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-bg-elevated)] text-sm focus-within:ring-2 focus-within:ring-[color:var(--ui-primary)]"
    :class="stateOpacityClass"
    :style="stateBorderStyle ?? undefined"
  >
    <!-- Hero (clickable to open details) -->
    <button
      type="button"
      class="relative aspect-[16/10] w-full overflow-hidden bg-[color:var(--ui-bg-muted)]"
      :aria-label="`Open details for ${place.name}`"
      @click="openDetails"
      @keydown="onCardKeydown"
    >
      <img
        v-if="heroPhoto"
        :src="heroPhoto.src"
        :alt="heroPhoto.alt"
        loading="lazy"
        class="size-full object-cover"
      >
      <div
        v-else
        class="flex size-full items-center justify-center text-xs text-[color:var(--ui-text-muted)]"
      >
        No photo
      </div>

      <UBadge
        v-if="proximity"
        icon="i-lucide-clock"
        color="neutral"
        variant="solid"
        size="xs"
        class="pointer-events-none absolute left-2 top-2 bg-black/60 text-white backdrop-blur-sm"
        :aria-label="`Proximity: ${proximity}`"
      >
        {{ proximity }}
      </UBadge>
    </button>

    <div class="flex flex-1 flex-col gap-1.5 p-3">
      <!-- Title row -->
      <div class="flex items-start gap-1.5">
        <span
          class="mt-1.5 size-2 shrink-0 rounded-full"
          :style="{ backgroundColor: priorityColor }"
          aria-hidden="true"
        />
        <button
          type="button"
          class="min-w-0 flex-1 truncate text-left font-medium hover:underline"
          @click="openDetails"
        >
          {{ place.name }}
        </button>
        <PlaceCardActions :place="place" @show-details="openDetails" />
      </div>

      <p class="truncate text-xs text-[color:var(--ui-text-muted)]">
        {{ place.area }}
      </p>
      <p class="text-xs text-[color:var(--ui-text-muted)]">
        {{ costSymbol }} · {{ place.duration }} min
      </p>

      <!-- Tags -->
      <div v-if="visibleTags.length > 0" class="flex flex-wrap gap-1 pt-0.5">
        <UBadge
          v-for="tag in visibleTags"
          :key="tag"
          color="neutral"
          variant="soft"
          size="xs"
        >
          {{ tag }}
        </UBadge>
      </div>

      <!-- Action footer -->
      <div class="mt-auto flex items-center justify-between pt-2">
        <StateButton :place-id="place.id" size="sm" />
        <AddToSlotMenu
          v-if="!props.scheduled && props.dayId"
          :place="place"
          @select="onAddToSlot"
        />
        <!-- 44×44 hit area wrap — task 9.5.7. -->
        <span
          v-else-if="!props.scheduled"
          class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center"
        >
          <UButton
            icon="i-heroicons-plus"
            size="xs"
            color="neutral"
            variant="soft"
            aria-label="Schedule in this slot"
            @click="emit('schedule', place.id)"
          />
        </span>
        <span
          v-else
          class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center"
        >
          <UButton
            icon="i-heroicons-x-mark"
            size="xs"
            color="neutral"
            variant="ghost"
            aria-label="Remove from slot"
            @click="emit('remove', place.id)"
          />
        </span>
      </div>
    </div>

    <PlaceDetails v-model:open="detailsOpen" :place="place" />
  </article>
</template>
