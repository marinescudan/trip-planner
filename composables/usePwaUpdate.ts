/**
 * Service-worker update + install-prompt orchestration for the PWA shell.
 *
 * - `useRegisterSW` (auto-injected by `@vite-pwa/nuxt`) tells us when a new
 *   build is available; we surface a toast with a "Refresh" action that
 *   calls `updateServiceWorker(true)` to skip-waiting + reload.
 * - `beforeinstallprompt` is captured eagerly so the SettingsMenu can fire
 *   the native install prompt later.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/pwa/spec.md
 *     (Service worker → "Update available", Install prompt on Android Chrome)
 */
import { useToast } from '#imports'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const installEvent = ref<BeforeInstallPromptEvent | null>(null)
const installed = ref(false)
let registered = false

export function usePwaUpdate(): {
  /** True once `beforeinstallprompt` has fired and not yet been consumed. */
  canInstall: ComputedRef<boolean>
  /** True after the app has been installed (display-mode standalone). */
  isInstalled: ComputedRef<boolean>
  /** Triggers the native install prompt; resolves to user's choice. */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
} {
  if (!registered && import.meta.client) {
    registered = true

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      installEvent.value = e as BeforeInstallPromptEvent
    })

    window.addEventListener('appinstalled', () => {
      installEvent.value = null
      installed.value = true
    })

    if (window.matchMedia?.('(display-mode: standalone)').matches) {
      installed.value = true
    }

    void registerServiceWorkerToast()
  }

  const canInstall = computed(() => installEvent.value !== null && !installed.value)
  const isInstalled = computed(() => installed.value)

  async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    const evt = installEvent.value
    if (!evt) return 'unavailable'
    await evt.prompt()
    const choice = await evt.userChoice
    installEvent.value = null
    return choice.outcome
  }

  return { canInstall, isInstalled, promptInstall }
}

/**
 * Wires up the auto-update toast. Imports `virtual:pwa-register/vue` lazily
 * because the module is only generated at build time by `@vite-pwa/nuxt`.
 */
async function registerServiceWorkerToast(): Promise<void> {
  try {
    const { useRegisterSW } = await import(/* @vite-ignore */ 'virtual:pwa-register/vue')
    const { needRefresh, updateServiceWorker } = useRegisterSW({
      immediate: true,
    })
    const toast = useToast()
    watch(needRefresh, (need) => {
      if (!need) return
      toast.add({
        id: 'pwa-update',
        title: 'New version ready',
        description: 'Refresh to get the latest build.',
        icon: 'i-heroicons-arrow-path',
        color: 'primary',
        duration: 0,
        actions: [
          {
            label: 'Refresh',
            onClick: () => {
              void updateServiceWorker(true)
            },
          },
        ],
      })
    })
  }
  catch {
    // Module not available in dev or in tests — silent no-op.
  }
}
