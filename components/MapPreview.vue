<script setup lang="ts">
/**
 * Tiny Leaflet preview centered on a single place.
 *
 * Leaflet is dynamically imported so the JS + CSS only ship when the
 * `PlaceDetails` modal actually opens (Phase 8 budget: keep first
 * paint lean for the day list).
 *
 * Offline behaviour:
 *   - `navigator.onLine === false` at mount → show "Map unavailable
 *     offline" placeholder; never attempt a tile fetch
 *   - tile fetches that fail at runtime → Leaflet draws empty tiles;
 *     the marker still renders so the user sees the location
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/map/spec.md
 */
import type { Map as LeafletMap } from 'leaflet'

import type { Place } from '~/types/place'

const props = defineProps<{
  place: Place
  /** Optional CSS height; defaults to 12rem. */
  height?: string
}>()

const mapEl = ref<HTMLDivElement | null>(null)
const failed = ref(false)
let mapInstance: LeafletMap | null = null

onMounted(async () => {
  if (typeof window === 'undefined') return
  if (!mapEl.value) return
  if (navigator?.onLine === false) {
    failed.value = true
    return
  }

  try {
    const L = await import('leaflet')
    // CSS is side-effect imported; bundlers (Vite) inline it on first import.
    await import('leaflet/dist/leaflet.css')

    mapInstance = L.map(mapEl.value, {
      center: props.place.coords,
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstance)
    L.marker(props.place.coords).addTo(mapInstance)
  } catch {
    failed.value = true
  }
})

onBeforeUnmount(() => {
  mapInstance?.remove()
  mapInstance = null
})
</script>

<template>
  <div
    v-if="failed"
    class="flex items-center justify-center rounded border border-dashed border-[color:var(--ui-border)] text-xs text-[color:var(--ui-text-muted)]"
    :style="{ height: props.height ?? '12rem' }"
    role="img"
    aria-label="Map unavailable offline"
  >
    Map unavailable offline · {{ place.coords[0].toFixed(3) }}, {{ place.coords[1].toFixed(3) }}
  </div>
  <div
    v-else
    ref="mapEl"
    class="overflow-hidden rounded border border-[color:var(--ui-border)]"
    :style="{ height: props.height ?? '12rem' }"
    :aria-label="`Map preview for ${place.name}`"
  />
</template>
