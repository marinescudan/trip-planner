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
const filters = useFilters()

const loadError = ref<string | null>(null)
const issues = ref<{ path: string; message: string }[]>([])
const filtersOpen = ref(false)

/**
 * Spec "Empty states & loading" — when active filters exclude every
 * place we surface a friendly relief banner above the day list with a
 * one-click "Reset filters" action, instead of a silently empty grid.
 */
const filtersHideEverything = computed(() => {
  if (!trip.value) return false
  const [matching, total] = filters.counts.value
  return total > 0 && matching === 0
})

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
          <div
            v-if="filtersHideEverything"
            class="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-bg-elevated)] p-4 text-sm"
            role="status"
          >
            <p class="flex-1 font-medium">
              Filters hide everything.
            </p>
            <UButton
              size="sm"
              color="primary"
              variant="soft"
              icon="i-heroicons-arrow-path"
              @click="filters.reset()"
            >
              Reset filters
            </UButton>
          </div>
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
      <!-- Boot loader window — task 9.5.3.
           Spec ("Empty states & loading") asks for a skeleton, never a
           bare spinner. The skeleton fades out at `--motion-fast` once
           `trip.value` resolves. -->
      <div
        class="grid gap-6 lg:grid-cols-[18rem_1fr]"
        :style="{ transition: `opacity var(--motion-fast) var(--motion-ease)` }"
      >
        <div class="hidden lg:block">
          <div class="h-72 animate-pulse rounded-lg bg-[color:var(--color-surface-2)]" />
        </div>
        <DayListSkeleton />
      </div>
    </template>
  </AppShell>
</template>
