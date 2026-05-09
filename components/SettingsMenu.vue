<script setup lang="ts">
/**
 * Settings dropdown rendered in the app top bar:
 *
 *   ⋮ → Export plan
 *       Import plan
 *       ──────────
 *       Reset all state  (typed confirmation)
 *       ──────────
 *       About
 *
 * Owns its file picker (hidden <input type="file">) and the typed-RESET
 * modal so AppShell stays presentational.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/state/spec.md
 *   openspec/changes/init-trip-planner/specs/ui-shell/spec.md
 */
import type { DropdownMenuItem } from '@nuxt/ui'

const planIO = usePlanIO()
const toast = useToast()
const pwa = usePwaUpdate()

const fileInput = ref<HTMLInputElement | null>(null)
const resetOpen = ref(false)
const aboutOpen = ref(false)
const resetConfirmText = ref('')
const resetBusy = ref(false)

const items = computed<DropdownMenuItem[][]>(() => {
  const groups: DropdownMenuItem[][] = []
  if (pwa.canInstall.value) {
    groups.push([
      {
        label: 'Install app',
        icon: 'i-heroicons-arrow-down-on-square',
        onSelect: () => { void onInstall() },
      },
    ])
  }
  groups.push([
    {
      label: 'Export plan',
      icon: 'i-heroicons-arrow-down-tray',
      onSelect: () => { void onExport() },
    },
    {
      label: 'Import plan',
      icon: 'i-heroicons-arrow-up-tray',
      onSelect: () => { fileInput.value?.click() },
    },
  ])
  groups.push([
    {
      label: 'Reset all state',
      icon: 'i-heroicons-trash',
      color: 'error',
      onSelect: () => {
        resetConfirmText.value = ''
        resetOpen.value = true
      },
    },
  ])
  groups.push([
    {
      label: 'About',
      icon: 'i-heroicons-information-circle',
      onSelect: () => { aboutOpen.value = true },
    },
  ])
  return groups
})

async function onInstall(): Promise<void> {
  const outcome = await pwa.promptInstall()
  if (outcome === 'accepted') {
    toast.add({ title: 'App installed', color: 'success', icon: 'i-heroicons-check' })
  }
  else if (outcome === 'unavailable') {
    toast.add({
      title: 'Install not available',
      description: 'Use your browser menu → Add to Home Screen.',
      color: 'info',
      icon: 'i-heroicons-information-circle',
    })
  }
}

async function onExport(): Promise<void> {
  try {
    await planIO.downloadExport()
    toast.add({ title: 'Plan exported', color: 'success', icon: 'i-heroicons-check' })
  }
  catch {
    toast.add({ title: 'Export failed', color: 'error', icon: 'i-heroicons-x-circle' })
  }
}

async function onFileChosen(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  // Reset the input so re-selecting the same file fires `change` again.
  input.value = ''
  if (!file) return
  let raw: string
  try {
    raw = await file.text()
  }
  catch {
    toast.add({ title: 'Could not read file', color: 'error', icon: 'i-heroicons-x-circle' })
    return
  }
  const parsed = planIO.parsePlan(raw)
  if (!parsed.ok) {
    toast.add({ title: 'Invalid plan file', description: parsed.error, color: 'error', icon: 'i-heroicons-x-circle' })
    return
  }
  const result = await planIO.importPlan(parsed.plan)
  if (!result.ok) {
    toast.add({ title: 'Import refused', description: result.error, color: 'error', icon: 'i-heroicons-x-circle' })
    return
  }
  toast.add({ title: 'Plan imported', color: 'success', icon: 'i-heroicons-check' })
}

const canReset = computed(() => resetConfirmText.value === 'RESET')

async function onResetConfirm(): Promise<void> {
  if (!canReset.value || resetBusy.value) return
  resetBusy.value = true
  try {
    await planIO.resetAllState()
    resetOpen.value = false
    toast.add({ title: 'All state cleared', color: 'success', icon: 'i-heroicons-check' })
  }
  finally {
    resetBusy.value = false
  }
}
</script>

<template>
  <div data-slot="settings-menu">
    <UDropdownMenu :items="items">
      <UButton
        icon="i-heroicons-ellipsis-vertical"
        color="neutral"
        variant="ghost"
        aria-label="Settings"
      />
    </UDropdownMenu>

    <input
      ref="fileInput"
      type="file"
      accept="application/json,.json"
      class="hidden"
      aria-hidden="true"
      @change="onFileChosen"
    >

    <!-- Reset confirmation modal -->
    <UModal v-model:open="resetOpen" :ui="{ content: 'max-w-md' }">
      <template #content>
        <div class="flex flex-col gap-3 p-5">
          <h2 class="font-display text-lg">Reset all state?</h2>
          <p class="text-sm text-[color:var(--ui-text-muted)]">
            This clears every place state, day assignment, and filter setting
            for the active trip. The trip itself is not affected.
            <br>This cannot be undone.
          </p>
          <label class="text-sm">
            Type
            <span class="font-mono font-semibold">RESET</span>
            to confirm:
            <UInput
              v-model="resetConfirmText"
              autocomplete="off"
              autofocus
              class="mt-1"
              placeholder="RESET"
            />
          </label>
          <div class="mt-2 flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              :disabled="resetBusy"
              @click="resetOpen = false"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :disabled="!canReset"
              :loading="resetBusy"
              @click="onResetConfirm"
            >
              Reset
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- About modal -->
    <UModal v-model:open="aboutOpen" :ui="{ content: 'max-w-md' }">
      <template #content>
        <div class="flex flex-col gap-2 p-5 text-sm">
          <h2 class="font-display text-lg">About</h2>
          <p>
            Trip Planner — an offline-first itinerary tool. Drop in a trip
            JSON, mark places, plan days, take it on the road.
          </p>
          <p class="text-[color:var(--ui-text-muted)]">
            All data stays on your device. No accounts, no tracking.
          </p>
          <div class="mt-2 flex justify-end">
            <UButton color="neutral" variant="ghost" @click="aboutOpen = false">
              Close
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
