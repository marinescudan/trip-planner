<script setup lang="ts">
/**
 * Dropdown menu listing locker entries + a "Load another trip…" link.
 * The button label is the active trip's title; the menu items switch the
 * active id and reload via the trip loader.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/ui-shell/spec.md
 *   openspec/changes/init-trip-planner/specs/trip-loading/spec.md (locker UX)
 */
import type { DropdownMenuItem } from '@nuxt/ui'

import type { LockerEntry } from '~/types/locker'

const router = useRouter()
const trip = useTrip()
const locker = useTripLocker()
const loader = useTripLoader()

const entries = ref<LockerEntry[]>([])
const activeId = ref<string | null>(null)
const loading = ref(false)

async function refresh(): Promise<void> {
  ;[entries.value, activeId.value] = await Promise.all([
    locker.listEntries(),
    locker.getActiveId(),
  ])
}

onMounted(refresh)
// Re-read when the active trip changes (any successful load updates this).
watch(() => trip.trip.value?.trip.id ?? null, refresh)

async function switchTo(id: string): Promise<void> {
  if (id === activeId.value || loading.value) return
  loading.value = true
  try {
    await locker.setActiveId(id)
    const r = await loader.resolve()
    if (!r.ok) {
      // The cached entry failed to validate — fall back to /load with context.
      await router.push('/load?reason=switch-failed')
    }
  } finally {
    loading.value = false
  }
}

const items = computed<DropdownMenuItem[][]>(() => {
  const tripItems: DropdownMenuItem[] = entries.value.map(e => ({
    label: e.title,
    icon: e.id === activeId.value ? 'i-heroicons-check' : undefined,
    onSelect: () => {
      void switchTo(e.id)
    },
  }))
  return [
    tripItems.length > 0
      ? tripItems
      : [{ label: 'No saved trips', type: 'label' as const }],
    [
      {
        label: 'Load another trip…',
        icon: 'i-heroicons-plus',
        to: '/load',
      },
    ],
  ]
})

const triggerLabel = computed(() => trip.trip.value?.trip.title ?? 'No trip')
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton
      color="neutral"
      variant="ghost"
      trailing-icon="i-heroicons-chevron-down"
      :loading="loading"
    >
      {{ triggerLabel }}
    </UButton>
  </UDropdownMenu>
</template>
