# Trip Planner — Málaga + Tarifa, May 12–23, 2026

A personal, single-user web app for planning an 11-day trip to Andalusia. Curated catalog of ~145 places, day-by-day itinerary with time slots, multi-state place tracking, filters by priority/zone/cost/tags, persisted in localStorage. No backend, no accounts, no tracking.

## Status
🚧 Spec-only. No code yet. Hand to Claude Code with the OpenSpec change to start implementing.

## Stack
Nuxt 3 · Vue 3 · TypeScript · Tailwind · Leaflet · Zod · Vitest · Vercel

## Getting started for Claude Code

```bash
# In Claude Code, from the project root:
# 1. Read the project context
cat openspec/project.md

# 2. Read the active change
ls openspec/changes/init-trip-planner/
cat openspec/changes/init-trip-planner/proposal.md
cat openspec/changes/init-trip-planner/design.md
cat openspec/changes/init-trip-planner/tasks.md

# 3. Read each capability spec
ls openspec/changes/init-trip-planner/specs/

# 4. Begin Phase 1, task 1.1 in tasks.md
```

## Local dev (after Phase 1 is done)

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # vitest
pnpm typecheck
pnpm build        # production build
pnpm preview      # preview built site
```

## Deploy

Push to `main` on the connected GitHub repo → Vercel deploys automatically. See `openspec/changes/init-trip-planner/specs/deployment/spec.md`.

## Folder map (post-implementation)

```
.
├── CLAUDE.md                    # Conventions for Claude Code
├── README.md
├── package.json
├── nuxt.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── openspec/
│   ├── project.md               # Always-loaded context
│   ├── specs/                   # (empty until first archive)
│   └── changes/
│       └── init-trip-planner/
│           ├── proposal.md
│           ├── design.md
│           ├── tasks.md
│           └── specs/
│               ├── data-model/spec.md
│               ├── places-catalog/spec.md
│               ├── itinerary/spec.md
│               ├── filters/spec.md
│               ├── state/spec.md
│               ├── map/spec.md
│               ├── ui-shell/spec.md
│               └── deployment/spec.md
├── pages/
│   └── index.vue
├── components/
├── composables/
├── types/
├── utils/
├── assets/
│   └── data/
│       ├── places.json          # ~145 entries
│       └── days.json            # 12 entries
└── tests/
```

## License
Private. Not for redistribution.
