<script setup lang="ts">
/**
 * Compact "Add to slot…" dropdown rendered on suggestion cards in flat
 * mode. Lists only the slots that intersect `place.validSlots ∩
 * trip.taxonomy.slots`, sorted by `slot.order`. The parent receives the
 * picked `slotId` via the `select` event and is responsible for calling
 * `useDayPlan().assignToSlot(...)`.
 *
 * Trigger style mirrors the legacy `[+]` schedule button (xs / soft /
 * neutral) so the action footer keeps its rhythm.
 *
 * Source of truth: flat-list change plan (spec edits queued).
 */
import type { DropdownMenuItem } from '@nuxt/ui'

import type { Place, Slot } from '~/types/place'

const props = defineProps<{
  place: Place
}>()

const emit = defineEmits<{
  select: [slotId: Slot]
}>()

const trip = useTrip()

const items = computed<DropdownMenuItem[]>(() => {
  const tax = trip.trip.value?.taxonomy
  if (!tax) return []
  const slotsAsc = [...tax.slots].sort((a, b) => a.order - b.order)
  return slotsAsc
    .filter(s => props.place.validSlots.includes(s.id))
    .map<DropdownMenuItem>((s) => {
      const label = s.icon ? `${s.icon} ${s.label}` : s.label
      return {
        label,
        onSelect: () => emit('select', s.id),
      }
    })
})
</script>

<template>
  <!-- 44×44 hit area wrap per ux-design "Spacing & touch targets" / task
       9.5.7. The visual button stays xs/soft to keep the card rhythm. -->
  <UDropdownMenu :items="items" :ui="{ content: 'min-w-40' }">
    <span class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center">
      <UButton
        icon="i-lucide-calendar-plus"
        size="xs"
        color="neutral"
        variant="soft"
        aria-label="Add to slot"
        :disabled="items.length === 0"
      />
    </span>
  </UDropdownMenu>
</template>
