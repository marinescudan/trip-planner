/**
 * Ambient module declarations for `@vite-pwa/nuxt`'s build-time virtual
 * modules. Only `useRegisterSW` from `virtual:pwa-register/vue` is consumed
 * by the project; other entry points exist but are not used.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/pwa/spec.md (Service worker)
 */
declare module 'virtual:pwa-register/vue' {
  import type { Ref } from 'vue'

  export interface RegisterSWOptions {
    immediate?: boolean
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
    onRegisteredSW?: (swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void
    onRegisterError?: (error: unknown) => void
  }

  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: Ref<boolean>
    offlineReady: Ref<boolean>
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>
  }
}
