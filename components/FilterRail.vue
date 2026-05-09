<script setup lang="ts">
/**
 * Filter rail wrapper. Renders the shared `FilterRailBody` either as a
 * desktop sticky sidebar (default) or, when `asDrawer` is true, inside
 * a `UDrawer` controlled via `v-model:drawerOpen`.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/filters/spec.md
 */
const props = withDefaults(
  defineProps<{
    /** When true, render as a mobile UDrawer body. */
    asDrawer?: boolean
  }>(),
  { asDrawer: false },
)

const drawerOpen = defineModel<boolean>('drawerOpen', { default: false })
</script>

<template>
  <UDrawer
    v-if="props.asDrawer"
    :open="drawerOpen"
    :handle="true"
    @update:open="drawerOpen = $event"
  >
    <template #content>
      <div class="max-h-[85vh] overflow-y-auto p-4">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="font-display text-lg">Filters</h2>
          <UButton
            icon="i-heroicons-x-mark"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="Close filters"
            @click="drawerOpen = false"
          />
        </div>
        <FilterRailBody />
      </div>
    </template>
  </UDrawer>

  <aside
    v-else
    class="hidden lg:block lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:pr-2"
    data-slot="filter-rail"
  >
    <FilterRailBody />
  </aside>
</template>
