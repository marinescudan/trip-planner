<script setup lang="ts">
/**
 * Full-info modal for a place:
 *   hero photo + photo gallery
 *   description (full)
 *   priority / cost / duration / area / zone meta
 *   opening hours, notes
 *   tags
 *   booking link if applicable
 *   MapPreview placeholder (wired in Phase 8 with Leaflet)
 *
 * Controlled by `v-model:open`.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/itinerary/spec.md (Place card in slot)
 */
import type { Place } from '~/types/place'
import { zoneToMinutes } from '~/utils/zones'

const props = defineProps<{
  place: Place
}>()

const open = defineModel<boolean>('open', { default: false })

const trip = useTrip()

const priorityLabel = computed(() => {
  return trip.trip.value?.taxonomy.priorityTiers.find(
    p => p.id === props.place.priority,
  )?.label ?? props.place.priority
})

const priorityColor = computed(() => {
  return trip.trip.value?.taxonomy.priorityTiers.find(
    p => p.id === props.place.priority,
  )?.color ?? '#999'
})

const costSymbol = computed(() => {
  return trip.trip.value?.taxonomy.costTiers.find(
    t => t.id === props.place.cost,
  )?.symbol ?? props.place.cost
})

const zoneLabel = computed(() => {
  return trip.trip.value?.taxonomy.zones.find(
    z => z.id === props.place.zone,
  )?.label ?? `Zone ${props.place.zone}`
})

const heroPhoto = computed(() => props.place.photos[0] ?? null)
const galleryPhotos = computed(() => props.place.photos.slice(1))

const homeBaseLabel = computed(() => {
  const id = props.place.homeBase
  if (!id) return ''
  return trip.trip.value?.homeBases.find(h => h.id === id)?.label ?? ''
})

/**
 * Plain-English proximity sentence for the details modal.
 * - Zone 4 (any home base): "~1 h day trip"
 * - Other zones with home base: "~5 minutes from your Málaga stay"
 * - Other zones without home base: "~15 minutes away"
 * - Unknown zone: empty string (UI omits)
 */
const proximitySentence = computed(() => {
  const minutes = zoneToMinutes(props.place.zone)
  if (!minutes) return ''
  // Convert "~5'" → "~5 minutes" and "~1h" → "~1 h"
  const pretty = minutes.endsWith('h')
    ? minutes.replace('h', ' h')
    : `${minutes.replace('\'', '')} minutes`
  if (String(props.place.zone) === '4') return `${pretty} day trip`
  if (homeBaseLabel.value) return `${pretty} from your ${homeBaseLabel.value} stay`
  return `${pretty} away`
})
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-2xl' }">
    <template #content>
      <div class="flex flex-col">
        <!-- Hero -->
        <figure
          v-if="heroPhoto"
          class="relative aspect-[16/9] overflow-hidden rounded-t-lg bg-[color:var(--ui-bg-muted)]"
        >
          <img
            :src="heroPhoto.src"
            :alt="heroPhoto.alt"
            loading="lazy"
            class="size-full object-cover"
          >
          <figcaption
            v-if="heroPhoto.credit"
            class="absolute bottom-0 right-0 bg-black/50 px-2 py-0.5 text-[10px] text-white"
          >
            {{ heroPhoto.credit }}
          </figcaption>
        </figure>

        <div class="flex flex-col gap-4 p-5">
          <!-- Title row -->
          <header class="flex items-start gap-2">
            <span
              class="mt-1.5 size-2.5 shrink-0 rounded-full"
              :style="{ backgroundColor: priorityColor }"
              :aria-label="`Priority: ${priorityLabel}`"
            />
            <div class="min-w-0 flex-1">
              <h2 class="font-display text-xl">{{ place.name }}</h2>
              <p class="text-sm text-[color:var(--ui-text-muted)]">
                {{ place.area }} · {{ zoneLabel }}
              </p>
              <p
                v-if="proximitySentence"
                class="mt-1 inline-flex items-center gap-1 text-sm text-[color:var(--ui-text-muted)]"
              >
                <UIcon name="i-lucide-clock" class="size-3.5" />
                <span>{{ proximitySentence }}</span>
              </p>
            </div>
            <UButton
              icon="i-heroicons-x-mark"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Close"
              @click="open = false"
            />
          </header>

          <!-- Meta strip -->
          <dl class="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div>
              <dt class="text-[color:var(--ui-text-muted)]">Priority</dt>
              <dd class="font-medium">{{ priorityLabel }}</dd>
            </div>
            <div>
              <dt class="text-[color:var(--ui-text-muted)]">Cost</dt>
              <dd class="font-medium">{{ costSymbol }}</dd>
            </div>
            <div>
              <dt class="text-[color:var(--ui-text-muted)]">Duration</dt>
              <dd class="font-medium">{{ place.duration }} min</dd>
            </div>
            <div>
              <dt class="text-[color:var(--ui-text-muted)]">Energy</dt>
              <dd class="font-medium">{{ place.energy }}</dd>
            </div>
          </dl>

          <!-- Description -->
          <p v-if="place.description" class="text-sm leading-relaxed">
            {{ place.description }}
          </p>

          <!-- Opening hours -->
          <section v-if="place.openingHours" class="text-sm">
            <h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-text-muted)]">
              Opening hours
            </h3>
            <p class="whitespace-pre-line">{{ place.openingHours }}</p>
          </section>

          <!-- Notes -->
          <section v-if="place.notes" class="text-sm">
            <h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-text-muted)]">
              Notes
            </h3>
            <p class="whitespace-pre-line">{{ place.notes }}</p>
          </section>

          <!-- Tags -->
          <div v-if="place.tags.length > 0" class="flex flex-wrap gap-1">
            <UBadge
              v-for="tag in place.tags"
              :key="tag"
              color="neutral"
              variant="soft"
              size="xs"
            >
              {{ tag }}
            </UBadge>
          </div>

          <!-- Booking -->
          <UButton
            v-if="place.bookingRequired && place.bookingUrl"
            :to="place.bookingUrl"
            target="_blank"
            rel="noopener noreferrer"
            icon="i-heroicons-ticket"
            color="primary"
            variant="solid"
            size="sm"
            class="self-start"
          >
            Book
          </UButton>

          <!-- Photo gallery -->
          <section v-if="galleryPhotos.length > 0">
            <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-text-muted)]">
              More photos
            </h3>
            <div class="grid grid-cols-3 gap-2">
              <figure
                v-for="(photo, i) in galleryPhotos"
                :key="i"
                class="aspect-square overflow-hidden rounded bg-[color:var(--ui-bg-muted)]"
              >
                <img
                  :src="photo.src"
                  :alt="photo.alt"
                  loading="lazy"
                  class="size-full object-cover"
                >
              </figure>
            </div>
          </section>

          <!-- Map preview (Leaflet, lazy) -->
          <MapPreview :place="place" />
        </div>
      </div>
    </template>
  </UModal>
</template>
