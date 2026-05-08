# CLAUDE.md — Conventions for Claude Code

This is the conventions file Claude Code reads at the start of every session. Keep it terse; defer detail to OpenSpec.

## Project rules

- **OpenSpec is the source of truth.** Read `openspec/project.md` before any change. Read `openspec/changes/init-trip-planner/` for the active change.
- **Do NOT run `openspec init`.** The OpenSpec structure is hand-authored and complete. Running `openspec init` would overwrite it. The OpenSpec CLI is optional for this project — you can read the markdown files directly. If installed, `openspec list` and `openspec validate init-trip-planner --strict` are useful sanity checks before starting Phase 1.
- **Spec → tasks → code, in that order.** Never write code that isn't motivated by a spec requirement and a corresponding task in `tasks.md`.
- **Mark tasks done with `- [x]`** in `tasks.md` as you complete them. Commit between tasks.
- **TypeScript everywhere.** No `any` without an inline `// eslint-disable-next-line` comment explaining why.
- **No new dependencies without checking the design.** The locked stack is in `openspec/project.md`. Adding e.g. Pinia, Vue Router, Vite plugins requires a spec amendment.

## Code conventions

- Vue 3 Composition API, `<script setup lang="ts">` only — no Options API
- Composables go in `composables/`, named `useXxx.ts`
- Components in `components/`, `PascalCase.vue`, prefixed by domain (`PlaceCard`, `DayHeader`, `SlotScroller`)
- Types in `types/`, one file per domain (`place.ts`, `day.ts`)
- Utils in `utils/`, pure functions only
- Tests in `tests/`, mirror source structure, Vitest + happy-dom
- IDs are kebab-case, prefixed: `mlg-` (Malaga), `trf-` (Tarifa), `dt-` (day trip), `log-` (logistics)

## Forced rules (DO NOT violate without spec amendment)

These are non-negotiable. If you find yourself wanting to break one of these, STOP and propose a spec amendment in chat instead.

### 🚫 Never inline TypeScript interfaces or types
- ❌ `defineProps<{ place: { id: string; name: string; ... } }>()`
- ✅ `import type { Place } from '~/types/place'; defineProps<{ place: Place }>()`
- ALL types live in `types/<domain>.ts`. Components and composables import them.
- Inline `Pick<Place, 'id'>` is OK. Inline literal object types are NOT.

### 🚫 Never use `any`
- If you cannot type something, use `unknown` and narrow it
- The ONLY exception: `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with a one-line reason

### 🚫 Never use Options API or `<script>` (no setup)
- Always `<script setup lang="ts">`

### 🚫 Never add a runtime dependency without checking project.md
- The locked stack is in `openspec/project.md`. Adding e.g. Pinia, Vue Router, axios, etc. requires a spec amendment.
- New dev dependencies for tests/types are OK.

### 🚫 Never use a UI primitive that's not from Nuxt UI
- For buttons, inputs, modals, drawers, accordions, tooltips, etc. — use `<UButton>`, `<UInput>`, `<UModal>`, `<USlideover>`, `<UAccordion>`, `<UTooltip>`
- Custom primitives only when Nuxt UI doesn't have an equivalent (e.g. `SlotScroller`, `PlaceCard` — domain components)
- Compose Nuxt UI primitives inside domain components; don't replace them.

### 🚫 Never use `localStorage` directly
- All persistence flows through `useStorage()` which delegates to the active `StorageAdapter`
- Direct `window.localStorage.*` calls are forbidden outside `LocalAdapter` itself

### 🚫 Never hardcode trip-specific values
- The number 12 (days), 159 (places), "Málaga", "2026-05-18" — these come from the loaded trip object
- The renderer must work for ANY valid trip JSON; the Málaga JSON is just the first dataset
- If a value feels "specific to this trip", check whether it should be in `trip.taxonomy` or `trip.theme` or `trip.travelers` first

### 🚫 Never break the offline guarantee
- Once the app shell is loaded, no runtime code should require a network call to function
- Map tiles, photos may fail offline (acceptable). State, filters, navigation, day list, place cards must NEVER fail offline.
- If you add a feature that requires network, gate it behind feature detection + fallback.

## Commit convention

`<type>(<scope>): <subject>`

Types: `feat`, `fix`, `chore`, `data`, `docs`, `test`, `refactor`, `style`.
Scopes: `trip-schema`, `trip-loading`, `trip-data`, `itinerary`, `filters`, `state`, `map`, `ui-shell`, `ux-design`, `pwa`, `deploy`.

Example: `feat(filters): add zone multi-select chips`

**Never** include `Co-Authored-By: Claude …` (or any other AI-attribution) trailers in commit messages or PR descriptions for this project. Plain commit messages only.

## Testing

- Run `pnpm test` before claiming a task complete
- Run `pnpm typecheck` before committing
- Manual browser test on `pnpm dev` after every UI task
- Test on a phone viewport (390×844 in DevTools) AND desktop (1440×900) before merging UI changes

## Workflow expectations

1. Read the relevant spec file under `openspec/changes/init-trip-planner/specs/`
2. Pick the next unchecked task in `tasks.md`
3. Implement against the spec scenarios — every scenario should be expressible as a test or a manual verification step
4. Run tests + typecheck
5. Commit
6. Mark the task `[x]`
7. Move to next task

When stuck or a spec is ambiguous, propose a spec amendment in chat before writing code that "interprets" the spec.

## Phase 0 self-check (run before Phase 1.1)

Before writing any code, paste the following checklist back to the user filling in your answers:

```
✅ I have read CLAUDE.md
✅ I have read openspec/project.md
✅ I have read openspec/changes/init-trip-planner/proposal.md
✅ I have read openspec/changes/init-trip-planner/design.md
✅ I have read openspec/changes/init-trip-planner/tasks.md
✅ I have read all 9 specs under openspec/changes/init-trip-planner/specs/

I understand:
- The locked stack: Nuxt 3, Nuxt UI v3, Tailwind, Zod, Leaflet, @vite-pwa/nuxt, pnpm, Vercel
- I will NOT inline types — all types go in types/<domain>.ts
- I will NOT use `any`
- I will NOT add deps outside the locked stack
- I will NOT use localStorage directly — everything goes through useStorage()/StorageAdapter
- I will NOT hardcode "Málaga", "12 days", "2026" — values come from the trip JSON
- I will commit between tasks and mark them [x] in tasks.md

Ready to begin Phase 1, task 1.1.
```

Wait for user confirmation before starting Phase 1.

## What NOT to do

- Don't add features not in the spec.
- Don't refactor unrelated code while implementing a task.
- Don't introduce a state library, an HTTP client, or a UI library beyond what's locked.
- Don't fetch data from external APIs at runtime (except map tiles, photos).
- Don't add analytics, tracking, or telemetry of any kind.
- Don't break the offline-first guarantee.
- Don't skip the Phase 0 self-check.
