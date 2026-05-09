<script setup lang="ts">
/**
 * Top-20 tag chips computed from the active trip's place catalog. Logic:
 * OR across selected tags by default; the AND switch flips the semantics.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/filters/spec.md
 */
import type { Place } from '~/types/place'

const props = defineProps<{
  places: readonly Place[]
}>()

const filters = useFilters()

const topTags = computed<string[]>(() => {
  const counts = new Map<string, number>()
  for (const p of props.places) {
    for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 20)
    .map(([t]) => t)
})

function toggle(tag: string): void {
  const cur = filters.filters.value.tags
  filters.setTags(
    cur.includes(tag) ? cur.filter(t => t !== tag) : [...cur, tag],
  )
}

function isOn(tag: string): boolean {
  return filters.filters.value.tags.includes(tag)
}
</script>

<template>
  <fieldset v-if="topTags.length > 0">
    <div class="mb-2 flex items-center justify-between">
      <legend class="text-xs font-medium uppercase tracking-wide text-[color:var(--ui-text-muted)]">
        Tags
      </legend>
      <label class="flex items-center gap-1.5 text-xs text-[color:var(--ui-text-muted)]">
        <USwitch
          :model-value="filters.filters.value.tagsAndMode"
          size="xs"
          @update:model-value="filters.setTagsAndMode($event)"
        />
        AND
      </label>
    </div>
    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="tag in topTags"
        :key="tag"
        type="button"
        class="rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ui-primary)] focus-visible:ring-offset-2"
        :class="[
          isOn(tag)
            ? 'border-transparent bg-[color:var(--ui-bg-elevated)] text-[color:var(--ui-text)]'
            : 'border-[color:var(--ui-border)] text-[color:var(--ui-text-muted)] hover:bg-[color:var(--ui-bg-muted)]',
        ]"
        :aria-pressed="isOn(tag)"
        @click="toggle(tag)"
      >
        #{{ tag }}
      </button>
    </div>
  </fieldset>
</template>
