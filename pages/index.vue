<script setup lang="ts">
/**
 * Placeholder home page — wired in Phase 5 (task 5.5) to the full
 * AppShell + filter rail + day list. For now it triggers the trip
 * loader on first mount so we can manually verify the resolution
 * priority described in trip-loading/spec.md.
 */
const router = useRouter()
const { trip } = useTrip()

const loadError = ref<string | null>(null)
const issues = ref<{ path: string; message: string }[]>([])

onMounted(async () => {
  if (trip.value) return
  const result = await useTripLoader().resolve()
  if (result.ok) return
  // Default trip missing → /load with banner per spec.
  // Validation errors also route to /load to surface diagnostics.
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
  <div class="mx-auto max-w-2xl p-6">
    <template v-if="trip">
      <p class="text-sm uppercase tracking-wide text-gray-500">
        {{ trip.trip.subtitle ?? trip.trip.startDate + ' – ' + trip.trip.endDate }}
      </p>
      <h1 class="font-display text-3xl mt-1">{{ trip.trip.title }}</h1>
      <p v-if="trip.trip.description" class="mt-3 text-gray-700">
        {{ trip.trip.description }}
      </p>
      <p class="mt-4 text-sm text-gray-500">
        {{ trip.places.length }} places · {{ trip.days.length }} days · home bases:
        {{ trip.homeBases.map(h => h.label).join(', ') }}
      </p>
      <p class="mt-6 text-xs text-gray-400">
        Phase 3 placeholder — real itinerary UI lands in Phase 5.
      </p>
    </template>
    <p v-else-if="loadError" class="text-red-600">{{ loadError }}</p>
    <p v-else class="text-gray-500">Loading trip…</p>
  </div>
</template>
