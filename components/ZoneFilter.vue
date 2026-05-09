<script setup lang="ts">
/** Multi-select chips for `trip.taxonomy.zones[]`. */
import type { ZoneDef } from '~/types/taxonomy'

defineProps<{
  zones: readonly ZoneDef[]
}>()

const filters = useFilters()

function toggle(id: ZoneDef['id']): void {
  const cur = filters.filters.value.zones
  filters.setZones(
    cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id],
  )
}

function isOn(id: ZoneDef['id']): boolean {
  return filters.filters.value.zones.includes(id)
}
</script>

<template>
  <fieldset>
    <legend class="mb-2 text-xs font-medium uppercase tracking-wide text-[color:var(--ui-text-muted)]">
      Zone
    </legend>
    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="z in zones"
        :key="String(z.id)"
        type="button"
        class="rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ui-primary)] focus-visible:ring-offset-2"
        :class="[
          isOn(z.id)
            ? 'border-transparent bg-[color:var(--ui-bg-elevated)] text-[color:var(--ui-text)]'
            : 'border-[color:var(--ui-border)] text-[color:var(--ui-text-muted)] hover:bg-[color:var(--ui-bg-muted)]',
        ]"
        :aria-pressed="isOn(z.id)"
        @click="toggle(z.id)"
      >
        {{ z.label }}
      </button>
    </div>
  </fieldset>
</template>
