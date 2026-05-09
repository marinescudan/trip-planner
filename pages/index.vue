<script setup lang="ts">
/**
 * Home page. Resolves the active trip on first mount per the loader
 * priority, then renders the AppShell + filter rail + day accordion.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/ui-shell/spec.md
 *   openspec/changes/init-trip-planner/specs/filters/spec.md
 *   openspec/changes/init-trip-planner/specs/itinerary/spec.md
 */
const router = useRouter()
const { trip } = useTrip()

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
          <DayAccordion />
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
