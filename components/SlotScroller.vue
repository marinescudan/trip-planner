<script setup lang="ts">
/**
 * Horizontal snap-scroll container for slot cards. Provides:
 *   - touch / wheel scroll (native)
 *   - keyboard arrows (←/→) when focused
 *   - mouse drag (pointer events, only on devices that don't natively
 *     support touch panning)
 *
 * The component is a pure presentational shell — children supply the
 * cards via the default slot and decide their own width.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/itinerary/spec.md
 */
const props = withDefaults(
  defineProps<{
    /** Pixel step for arrow-key + button scroll. */
    step?: number
    ariaLabel?: string
  }>(),
  { step: 240, ariaLabel: 'Scrollable list' },
)

const scrollerRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)

let dragStartX = 0
let dragStartScroll = 0
let pointerId: number | null = null

function onKeydown(event: KeyboardEvent): void {
  const el = scrollerRef.value
  if (!el) return
  if (event.key === 'ArrowRight') {
    el.scrollBy({ left: props.step, behavior: 'smooth' })
    event.preventDefault()
  } else if (event.key === 'ArrowLeft') {
    el.scrollBy({ left: -props.step, behavior: 'smooth' })
    event.preventDefault()
  }
}

function onPointerDown(event: PointerEvent): void {
  // Only engage drag for mouse input — touch already pans natively and
  // hijacking pointermove on touch breaks vertical page scroll.
  if (event.pointerType !== 'mouse') return
  const el = scrollerRef.value
  if (!el) return
  isDragging.value = true
  dragStartX = event.clientX
  dragStartScroll = el.scrollLeft
  pointerId = event.pointerId
  el.setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
  if (!isDragging.value || pointerId !== event.pointerId) return
  const el = scrollerRef.value
  if (!el) return
  el.scrollLeft = dragStartScroll - (event.clientX - dragStartX)
}

function endDrag(event: PointerEvent): void {
  if (pointerId !== event.pointerId) return
  isDragging.value = false
  pointerId = null
  scrollerRef.value?.releasePointerCapture(event.pointerId)
}
</script>

<template>
  <div
    ref="scrollerRef"
    class="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ui-primary)] focus-visible:ring-offset-2"
    :class="[isDragging ? 'cursor-grabbing select-none' : 'cursor-grab']"
    role="region"
    :aria-label="props.ariaLabel"
    tabindex="0"
    data-slot="slot-scroller"
    @keydown="onKeydown"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="endDrag"
    @pointercancel="endDrag"
  >
    <slot />
  </div>
</template>
