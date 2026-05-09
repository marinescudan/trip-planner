<script setup lang="ts">
/** Multi-select chips for `trip.taxonomy.costTiers[]`. */
import type { CostTierDef } from '~/types/taxonomy'

defineProps<{
  tiers: readonly CostTierDef[]
}>()

const filters = useFilters()

function toggle(id: string): void {
  const cur = filters.filters.value.costTiers
  filters.setCostTiers(
    cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id],
  )
}

function isOn(id: string): boolean {
  return filters.filters.value.costTiers.includes(id)
}
</script>

<template>
  <fieldset>
    <legend class="mb-2 text-xs font-medium uppercase tracking-wide text-[color:var(--ui-text-muted)]">
      Cost
    </legend>
    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="t in tiers"
        :key="t.id"
        type="button"
        class="rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ui-primary)] focus-visible:ring-offset-2"
        :class="[
          isOn(t.id)
            ? 'border-transparent bg-[color:var(--ui-bg-elevated)] text-[color:var(--ui-text)]'
            : 'border-[color:var(--ui-border)] text-[color:var(--ui-text-muted)] hover:bg-[color:var(--ui-bg-muted)]',
        ]"
        :aria-pressed="isOn(t.id)"
        @click="toggle(t.id)"
      >
        {{ t.symbol ?? t.label }}
      </button>
    </div>
  </fieldset>
</template>
