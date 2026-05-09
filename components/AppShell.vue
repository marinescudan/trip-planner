<script setup lang="ts">
/**
 * Top app bar wrapper. Sticky bar with title/subtitle/date range and the
 * "Day n of N" label, plus the trip switcher and a 3-dot settings menu.
 *
 * The mobile "Filters" button is rendered here too; the parent owns the
 * drawer-open state and listens via `v-model:filtersOpen`.
 *
 * Settings menu actions (Export / Import / Reset / About) live in
 * `SettingsMenu.vue` (Phase 9 — wires the real handlers via `usePlanIO`).
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/ui-shell/spec.md
 */
import { todayISO, tripProgress } from '~/utils/trip-progress'

const filtersOpen = defineModel<boolean>('filtersOpen', { default: false })

const trip = useTrip()

const progress = computed(() => {
  const t = trip.trip.value
  if (!t) return null
  return tripProgress(todayISO(), t.trip.startDate, t.trip.endDate)
})

const dateRangeLabel = computed(() => {
  const t = trip.trip.value
  if (!t) return ''
  return `${formatShort(t.trip.startDate)} – ${formatShort(t.trip.endDate)}`
})

function formatShort(iso: string): string {
  // "May 12" / "Jun 2" — locale-light, deterministic across SSR/CSR.
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const m = months[Number(iso.slice(5, 7)) - 1]!
  const d = Number(iso.slice(8, 10))
  return `${m} ${d}`
}
</script>

<template>
  <div class="min-h-screen bg-[color:var(--ui-bg)]">
    <header
      class="sticky top-0 z-40 border-b border-[color:var(--ui-border)] bg-[color:var(--ui-bg)]/85 backdrop-blur"
    >
      <div class="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <!-- Title block ----------------------------------------------- -->
        <div class="min-w-0 flex-1">
          <h1 class="font-display truncate text-xl leading-tight">
            {{ trip.trip.value?.trip.title ?? 'Trip Planner' }}
          </h1>
          <p
            v-if="trip.trip.value"
            class="truncate text-xs text-[color:var(--ui-text-muted)]"
          >
            <span v-if="trip.trip.value.trip.subtitle" class="mr-2">
              {{ trip.trip.value.trip.subtitle }}
            </span>
            <span class="mr-2">{{ dateRangeLabel }}</span>
            <span v-if="progress" class="font-medium">{{ progress.label }}</span>
          </p>
        </div>

        <!-- Right-side controls --------------------------------------- -->
        <UButton
          icon="i-heroicons-funnel"
          color="neutral"
          variant="ghost"
          aria-label="Open filters"
          class="lg:hidden"
          @click="filtersOpen = true"
        />
        <TripSwitcher />
        <SettingsMenu />
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-4">
      <slot />
    </main>
  </div>
</template>
