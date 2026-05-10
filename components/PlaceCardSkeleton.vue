<script setup lang="ts">
/**
 * Skeleton loader for `PlaceCard.vue`. Shown while the trip JSON is
 * resolving so the boot frame is never blank. Matches the real card
 * footprint (16:10 hero + two text bars) so the layout doesn't jump
 * once the real data arrives.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/ux-design/spec.md
 *   ("Empty states & loading" — card skeleton)
 */
</script>

<template>
  <div
    class="flex w-60 shrink-0 flex-col overflow-hidden rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-bg-elevated)] text-sm"
    aria-hidden="true"
  >
    <div class="aspect-[16/10] w-full animate-pulse bg-[color:var(--color-surface-2)]" />
    <div class="flex flex-col gap-2 p-3">
      <div class="h-4 w-[70%] animate-pulse rounded bg-[color:var(--color-surface-2)]" />
      <div class="h-3 w-[50%] animate-pulse rounded bg-[color:var(--color-surface-2)]" />
    </div>
  </div>
</template>
