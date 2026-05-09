<script setup lang="ts">
/**
 * Filter-rail search input. 200ms debounce per spec; case- and
 * accent-insensitive matching is implemented in `utils/filter-match.ts`.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/filters/spec.md
 */
const filters = useFilters()

const local = ref(filters.filters.value.search)

let timer: ReturnType<typeof setTimeout> | null = null

watch(
  () => filters.filters.value.search,
  (next) => {
    if (next !== local.value) local.value = next
  },
)

function onUpdate(value: string | number): void {
  local.value = String(value)
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    if (local.value !== filters.filters.value.search) {
      filters.setSearch(local.value)
    }
  }, 200)
}

function clear(): void {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  local.value = ''
  filters.setSearch('')
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <UInput
    :model-value="local"
    placeholder="Search places, areas, tags…"
    icon="i-heroicons-magnifying-glass"
    size="sm"
    :ui="{ base: 'w-full' }"
    class="w-full"
    @update:model-value="onUpdate"
  >
    <template v-if="local.length > 0" #trailing>
      <UButton
        icon="i-heroicons-x-mark"
        color="neutral"
        variant="link"
        size="xs"
        aria-label="Clear search"
        @click="clear"
      />
    </template>
  </UInput>
</template>
