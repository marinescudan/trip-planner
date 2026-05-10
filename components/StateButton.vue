<script setup lang="ts">
/**
 * Per-place state cycler.
 *
 *   Click            → cycleState (untouched → wishlist → scheduled → done →
 *                      untouched; skipped → untouched per spec)
 *   Right-click /    → open menu offering "Skip" (and "Restore" when already
 *   long-press         skipped) — the explicit transitions outside the cycle
 *
 * The icon + tone come from `utils/place-state-ui.ts` so any future status
 * indicator stays consistent.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/state/spec.md (Skip and restore)
 *   openspec/changes/init-trip-planner/specs/itinerary/spec.md (State change from card)
 */
import type { DropdownMenuItem } from '@nuxt/ui'

import type { PlaceId } from '~/types/place'

import { PLACE_STATE_UI } from '~/utils/place-state-ui'

const props = defineProps<{
  placeId: PlaceId
  /** Tailwind size token forwarded to UButton. */
  size?: 'xs' | 'sm' | 'md'
}>()

const placeState = usePlaceState()

const LONG_PRESS_MS = 500
const LONG_PRESS_MOVE_PX = 6

const menuOpen = ref(false)
const longPressFired = ref(false)
let longPressTimer: ReturnType<typeof setTimeout> | null = null
let pressOrigin: { x: number, y: number } | null = null

const state = computed(() => placeState.getState(props.placeId))
const ui = computed(() => PLACE_STATE_UI[state.value])

const toneColor = computed<'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'error'>(() => {
  return ui.value.tone
})

const menuItems = computed<DropdownMenuItem[][]>(() => {
  const items: DropdownMenuItem[] = []
  if (state.value === 'skipped') {
    items.push({
      label: 'Restore',
      icon: 'i-heroicons-arrow-uturn-left',
      onSelect: () => placeState.setState(props.placeId, 'untouched'),
    })
  } else {
    items.push({
      label: 'Skip',
      icon: 'i-heroicons-x-circle',
      onSelect: () => placeState.skip(props.placeId),
    })
  }
  return [items]
})

function clearLongPress(): void {
  if (longPressTimer != null) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
  pressOrigin = null
}

function onPointerDown(e: PointerEvent): void {
  longPressFired.value = false
  pressOrigin = { x: e.clientX, y: e.clientY }
  longPressTimer = setTimeout(() => {
    longPressFired.value = true
    menuOpen.value = true
    longPressTimer = null
  }, LONG_PRESS_MS)
}

function onPointerMove(e: PointerEvent): void {
  if (!pressOrigin) return
  const dx = e.clientX - pressOrigin.x
  const dy = e.clientY - pressOrigin.y
  if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_PX) clearLongPress()
}

function onPointerUp(): void {
  clearLongPress()
}

function onClick(e: MouseEvent): void {
  // Suppress the cycle if the long-press already opened the menu.
  if (longPressFired.value) {
    longPressFired.value = false
    e.preventDefault()
    e.stopPropagation()
    return
  }
  placeState.cycleState(props.placeId)
}

function onContextMenu(e: MouseEvent): void {
  e.preventDefault()
  menuOpen.value = true
}
</script>

<template>
  <UDropdownMenu
    v-model:open="menuOpen"
    :items="menuItems"
    :ui="{ content: 'min-w-32' }"
  >
    <UTooltip :text="ui.label">
      <!-- 44×44 hit area wrap — task 9.5.7. The visual button keeps its
           passed-in size; the wrap only enlarges the pointer target. -->
      <span class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center">
        <UButton
          :icon="ui.icon"
          :color="toneColor"
          :size="props.size ?? 'sm'"
          variant="ghost"
          :aria-label="`State: ${ui.label}. Click to advance, right-click for more.`"
          @click="onClick"
          @contextmenu="onContextMenu"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="clearLongPress"
          @pointerleave="clearLongPress"
        />
      </span>
    </UTooltip>
  </UDropdownMenu>
</template>
