<script setup lang="ts">
/**
 * Home page. Resolves the active trip on first mount per the loader
 * priority, then renders the AppShell + filter rail. The day list
 * lands in Phase 6; for now we surface a small live preview of how
 * many places pass the filters so the rail is observably wired up.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/ui-shell/spec.md
 *   openspec/changes/init-trip-planner/specs/filters/spec.md
 */
const router = useRouter()
const { trip } = useTrip()
const filters = useFilters()

const loadError = ref<string | null>(null)
const issues = ref<{ path: string; message: string }[]>([])
const filtersOpen = ref(false)

onMounted(async () => {
  if (trip.value) return
  const result = await useTripLoader().resolve()
  if (result.ok) return
  if (
    result.error.kind === 'no-trip' ||
    (result.error.kind === 'fetch' && result.error.status === 404)
  ) {
    await router.push('/load?reason=no-default')
    return
  }
  loadError.value = describeError(result.error.kind)
  if (result.error.kind === 'validation') {
    issues.value = result.error.issues.map(i => ({
      path: i.path.length > 0 ? i.path.join('.') : '<root>',
      message: i.message,
    }))
  }
  await router.push('/load')
})

function describeError(kind: string): string {
  switch (kind) {
    case 'parse': return 'Trip JSON is not valid JSON.'
    case 'validation': return 'Trip JSON failed schema validation.'
    case 'fetch': return 'Trip JSON could not be fetched.'
    case 'cors': return 'Trip JSON URL blocked by CORS.'
    default: return 'Trip JSON could not be loaded.'
  }
}
</script>

<template>
  <AppShell v-model:filters-open="filtersOpen">
    <template v-if="trip">
      <div class="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <FilterRail />

        <section class="min-w-0">
          <p class="text-xs uppercase tracking-wide text-[color:var(--ui-text-muted)]">
            Phase 5 placeholder — day list lands in Phase 6
          </p>
          <p class="mt-1 text-sm text-[color:var(--ui-text-muted)]">
            {{ filters.counts.value[0] }} of {{ filters.counts.value[1] }} places match the current filters.
          </p>

          <ul
            v-if="filters.filteredPlaces.value.length > 0"
            class="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
          >
            <li
              v-for="p in filters.filteredPlaces.value.slice(0, 24)"
              :key="p.id"
              class="rounded-lg border border-[color:var(--ui-border)] p-3 text-sm"
            >
              <p class="truncate font-medium">{{ p.name }}</p>
              <p class="truncate text-xs text-[color:var(--ui-text-muted)]">
                {{ p.area ?? '—' }} · {{ p.cost ?? '—' }} · zone {{ p.zone }}
              </p>
            </li>
          </ul>

          <p
            v-else
            class="mt-6 text-sm text-[color:var(--ui-text-muted)]"
          >
            No places match the current filters.
          </p>
        </section>
      </div>

      <!-- Mobile drawer (lg- only). Same body as the desktop sidebar. -->
      <FilterRail
        as-drawer
        v-model:drawer-open="filtersOpen"
      />
    </template>

    <template v-else-if="loadError">
      <p class="text-red-600">{{ loadError }}</p>
    </template>

    <template v-else>
      <p class="text-[color:var(--ui-text-muted)]">Loading trip…</p>
    </template>
  </AppShell>
</template>
