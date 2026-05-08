<script setup lang="ts">
/**
 * /load — three input methods (URL, paste JSON, file drop) all flow
 * through the same `useTripLoader` validation path. On success, we
 * redirect to `/`; on failure, we render diagnostics inline.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/trip-loading/spec.md
 */
import type { LoaderResult } from '~/composables/useTripLoader'

const route = useRoute()
const router = useRouter()
const loader = useTripLoader()

const urlInput = ref('')
const pasteInput = ref('')
const fileInput = ref<File | null>(null)

const submitting = ref(false)
const errorMessage = ref<string | null>(null)
const errorIssues = ref<{ path: string; message: string }[]>([])
const reason = computed(() => (route.query.reason as string | undefined) ?? null)

async function submitUrl(): Promise<void> {
  if (!urlInput.value.trim()) {
    setError('Paste a URL first.')
    return
  }
  await runLoad(() => loader.loadFromUrl(urlInput.value.trim(), 'url'))
}

async function submitPaste(): Promise<void> {
  if (!pasteInput.value.trim()) {
    setError('Paste some JSON first.')
    return
  }
  await runLoad(() => loader.loadFromText(pasteInput.value, 'paste'))
}

async function submitFile(): Promise<void> {
  if (!fileInput.value) {
    setError('Choose a JSON file first.')
    return
  }
  let text: string
  try {
    text = await fileInput.value.text()
  } catch (e) {
    setError(`Could not read file: ${e instanceof Error ? e.message : String(e)}`)
    return
  }
  await runLoad(() => loader.loadFromText(text, 'upload'))
}

function onFileChange(event: Event): void {
  const target = event.target as HTMLInputElement
  fileInput.value = target.files?.[0] ?? null
}

async function runLoad(fn: () => Promise<LoaderResult>): Promise<void> {
  submitting.value = true
  errorMessage.value = null
  errorIssues.value = []
  try {
    const result = await fn()
    if (result.ok) {
      await router.push('/')
      return
    }
    const e = result.error
    switch (e.kind) {
      case 'parse':
        setError(`Invalid JSON: ${e.message}`)
        break
      case 'fetch':
        setError(
          e.status != null
            ? `Could not fetch (HTTP ${e.status}). Is the URL reachable?`
            : `Could not fetch: ${e.message}`,
        )
        break
      case 'cors':
        setError(
          "This URL doesn't allow cross-origin access. Download the file and upload it instead.",
        )
        break
      case 'no-trip':
        setError('No trip JSON found at the given source.')
        break
      case 'validation':
        errorMessage.value = `Validation failed (${e.issues.length} issue${e.issues.length === 1 ? '' : 's'}).`
        errorIssues.value = e.issues.map(issue => ({
          path: issue.path.length > 0 ? issue.path.join('.') : '<root>',
          message: issue.message,
        }))
        break
    }
  } finally {
    submitting.value = false
  }
}

function setError(msg: string): void {
  errorMessage.value = msg
  errorIssues.value = []
}
</script>

<template>
  <div class="mx-auto max-w-2xl p-6">
    <h1 class="font-display text-3xl mb-2">Load a trip</h1>
    <p v-if="reason === 'no-default'" class="text-sm text-amber-700 mb-4">
      No default trip — load one to get started.
    </p>
    <p v-else class="text-sm text-gray-600 mb-6">
      Provide trip JSON via URL, paste, or file upload.
    </p>

    <!-- URL ------------------------------------------------------------ -->
    <section class="mb-8">
      <h2 class="font-medium mb-2">From URL</h2>
      <div class="flex gap-2">
        <UInput
          v-model="urlInput"
          placeholder="https://example.com/trip.json"
          class="flex-1"
          :disabled="submitting"
          type="url"
          @keyup.enter="submitUrl"
        />
        <UButton :loading="submitting" @click="submitUrl">Load URL</UButton>
      </div>
    </section>

    <!-- Paste ---------------------------------------------------------- -->
    <section class="mb-8">
      <h2 class="font-medium mb-2">Paste JSON</h2>
      <UTextarea
        v-model="pasteInput"
        :rows="8"
        :disabled="submitting"
        placeholder='{"$schema":"trip-app/v1.0.0", ...}'
        class="w-full font-mono text-xs"
      />
      <UButton class="mt-2" :loading="submitting" @click="submitPaste">
        Load JSON
      </UButton>
    </section>

    <!-- File ----------------------------------------------------------- -->
    <section class="mb-8">
      <h2 class="font-medium mb-2">Upload file</h2>
      <input
        type="file"
        accept="application/json,.json"
        :disabled="submitting"
        class="block text-sm"
        @change="onFileChange"
      />
      <UButton class="mt-2" :loading="submitting" @click="submitFile">
        Load file
      </UButton>
    </section>

    <!-- Errors --------------------------------------------------------- -->
    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      :title="errorMessage"
      class="mt-4"
    />
    <ul
      v-if="errorIssues.length"
      class="mt-3 text-sm text-red-700 list-disc pl-6 space-y-1"
    >
      <li v-for="(issue, idx) in errorIssues" :key="idx">
        <code class="text-xs bg-red-50 px-1 py-0.5 rounded">{{ issue.path }}</code>
        — {{ issue.message }}
      </li>
    </ul>
  </div>
</template>
