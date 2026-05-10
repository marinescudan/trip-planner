<script setup lang="ts">
/**
 * Skeleton loader for the day accordion. Rendered while the trip JSON is
 * being resolved on first boot. Three rows × two card placeholders each —
 * matches the spec's "3 grey rows pulsing at --color-surface-2" line.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/ux-design/spec.md
 *   ("Empty states & loading" — Day list skeleton)
 */
</script>

<template>
  <div
    class="flex flex-col gap-3"
    aria-hidden="true"
    role="status"
    aria-label="Loading trip"
  >
    <div
      v-for="row in 3"
      :key="row"
      class="overflow-hidden rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-bg-elevated)]"
    >
      <!-- Day header bar -->
      <div class="h-14 animate-pulse border-b border-[color:var(--ui-border)] bg-[color:var(--color-surface-2)]" />
      <!-- Two card placeholders inside -->
      <div class="flex gap-3 p-3">
        <PlaceCardSkeleton />
        <PlaceCardSkeleton />
      </div>
    </div>
  </div>
</template>
