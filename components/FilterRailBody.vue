<script setup lang="ts">
/**
 * Inner content for the filter rail — same body whether shown as a
 * sticky sidebar (desktop) or inside a UDrawer (mobile).
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/filters/spec.md
 */
const trip = useTrip()
const filters = useFilters()

const taxonomy = computed(() => trip.trip.value?.taxonomy)
const places = computed(() => trip.trip.value?.places ?? [])

const matching = computed(() => filters.counts.value[0])
const total = computed(() => filters.counts.value[1])
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Match count + reset ----------------------------------------- -->
    <div class="flex items-center justify-between">
      <p class="text-xs text-[color:var(--ui-text-muted)]">
        <span class="font-semibold text-[color:var(--ui-text)]">{{ matching }}</span>
        / {{ total }} places
      </p>
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-heroicons-arrow-path"
        @click="filters.reset()"
      >
        Reset
      </UButton>
    </div>

    <SearchInput />

    <PriorityTierFilter
      v-if="taxonomy"
      :tiers="taxonomy.priorityTiers"
    />

    <ZoneFilter
      v-if="taxonomy"
      :zones="taxonomy.zones"
    />

    <CostFilter
      v-if="taxonomy"
      :tiers="taxonomy.costTiers"
    />

    <TagChips :places="places" />

    <!-- Show hidden ------------------------------------------------- -->
    <label class="flex items-center justify-between gap-2 border-t border-[color:var(--ui-border)] pt-3 text-xs text-[color:var(--ui-text-muted)]">
      <span>Show skipped places</span>
      <USwitch
        :model-value="filters.filters.value.showHidden"
        size="sm"
        @update:model-value="filters.setShowHidden($event)"
      />
    </label>
  </div>
</template>
