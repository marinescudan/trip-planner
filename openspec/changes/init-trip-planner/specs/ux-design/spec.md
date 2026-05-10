# Spec Delta: UX & Visual Design

## ADDED Requirements

### Requirement: Device-tier UX hierarchy
The app SHALL be designed mobile-first with three distinct mental models per device tier:

- **Phone (≤640px) — "Consumption mode"**: in-the-moment reference during the trip. One-handed use, large taps, minimal cognitive load. Today's day expanded by default; everything else collapsed.
- **Tablet (641–1023px) — "Couch planning"**: pre-trip cozy planning, two people looking at one screen. Two-column where landscape allows; same content as phone, more room to breathe.
- **Desktop (≥1024px) — "Full planning workspace"**: filter rail always visible, multi-day at a glance, hover affordances. Best for the bulk of the planning work before the trip.

#### Scenario: Phone view priority
- **GIVEN** viewport 390×844 on May 15
- **WHEN** the app loads
- **THEN** Day 4 is the only expanded accordion
- **AND** the filter rail is collapsed behind a "Filters" button
- **AND** every interactive element has ≥44pt touch target

#### Scenario: Tablet landscape split
- **GIVEN** viewport 1024×768 (iPad landscape)
- **WHEN** the app loads
- **THEN** filter rail is visible on the left (~240px)
- **AND** the day list takes the rest

### Requirement: Color palette
The app SHALL use a warm Andalusian-inspired palette, exposed as CSS custom properties on `:root`. Trip-defined `theme` overrides are merged on top.

```css
:root {
  /* Surfaces */
  --color-bg:           #fefcf9;  /* warm off-white */
  --color-surface:      #ffffff;  /* card background */
  --color-surface-2:    #f5f1ea;  /* hover/elevated */
  --color-surface-3:    #ebe5d8;  /* selected */
  --color-border:       #e2dccf;
  --color-border-hard:  #c9c0ad;

  /* Text */
  --color-text:         #1c1917;  /* near-black */
  --color-text-muted:   #57534e;
  --color-text-subtle:  #a8a29e;

  /* Brand accents (trip-overridable) */
  --color-primary:      #0369a1;  /* deep sea */
  --color-accent:       #c2410c;  /* terracotta */
  --color-highlight:    #f59e0b;  /* sunset gold */

  /* Priority dots (from trip taxonomy) */
  --color-priority-must:        #dc2626;
  --color-priority-recommended: #f59e0b;
  --color-priority-optional:    #16a34a;
  --color-priority-backup:      #94a3b8;

  /* State semantics */
  --color-state-wishlist:  #f59e0b;
  --color-state-scheduled: #0369a1;
  --color-state-done:      #65a30d;  /* olive */
  --color-state-skipped:   #a8a29e;

  /* Feedback */
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-error:   #dc2626;
  --color-focus:   #0ea5e9;
}
```

Contrast: text on bg ≥ 7:1, muted text ≥ 4.5:1, all interactive borders ≥ 3:1.

### Requirement: Typography
The app SHALL use a two-font system loaded as system-or-Google-fonts:

```
--font-sans:    'Inter', system-ui, -apple-system, sans-serif;
--font-display: 'Fraunces', Georgia, serif;  /* warmth for trip title only */
--font-mono:    ui-monospace, monospace;
```

Type scale (phone first, scales up at ≥1024px):
| Token | Phone | Desktop | Use |
|---|---|---|---|
| `--text-xs`   | 12px | 12px | timestamps, hints |
| `--text-sm`   | 13px | 14px | secondary labels, badges |
| `--text-base` | 15px | 16px | body, card titles |
| `--text-lg`   | 17px | 18px | section headers |
| `--text-xl`   | 20px | 22px | day title |
| `--text-2xl`  | 24px | 28px | trip subtitle |
| `--text-3xl`  | 30px | 36px | trip title (display font) |

Line height: 1.4 body, 1.2 headings.

### Requirement: Spacing & touch targets
- Spacing scale: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64` (Tailwind defaults).
- Minimum touch target: 44×44pt (WCAG 2.5.5). Buttons/icons SHALL pad to meet this even if visual size is smaller.
- Card edge padding: 16px on phone, 20px on tablet+, 24px on desktop.
- Vertical rhythm between cards: 12px on phone, 16px on tablet+.

### Requirement: Components — phone-specific
- **Slot scroller**: horizontal scroll with snap, peek of next card (~16px) visible, drag inertia, scroll affordance fades after first interaction.
- **Filter rail**: bottom sheet drawer. Drag handle at top. Dismiss by drag-down or backdrop tap. Backdrop has 60% black overlay.
- **Day accordion header**: 56px tall, large tap area, only one expanded at a time on phone (auto-collapse others).
- **Place card**: hero photo top (16:10), title + meta below, tags as chips, state button right-aligned and 44pt. Long-press card → action sheet (Skip, Move to slot, Open Maps).
- **Top bar**: trip title scrolls under (collapsed mode), only "today badge" stays visible.

### Requirement: Components — tablet/desktop specific
- **Filter rail**: sticky left sidebar (240–280px). Sections collapsible. Always visible.
- **Day accordion**: multi-expand allowed. Open multiple days side-by-side mentally compared.
- **Place card**: hover state shows quick-action toolbar (Maps / Move / Skip). Click expands inline detail without modal.
- **Place details**: opens as side drawer (right, 480px) on desktop, full modal on phone, half-screen sheet on tablet.

### Requirement: Motion
Motion SHALL be subtle and purposeful, never decorative.

- Duration: 120ms for state changes (button press), 200ms for layout (accordion), 280ms for sheet/drawer.
- Easing: `cubic-bezier(0.32, 0.72, 0, 1)` (Apple-ish, feels native on iOS).
- Reduced-motion: `prefers-reduced-motion` SHALL disable transitions and use instant state changes.
- No bouncing, no parallax, no spring overshoot. This is a planning tool.

### Requirement: Image error fallback
Every `<img>` rendering a `PhotoRef.src` SHALL handle load errors via an `onerror` cascade:

1. If `PhotoRef.fallback` is defined, swap to fallback URL
2. If fallback also fails OR is absent, swap to `https://picsum.photos/seed/<placeId>/800/600`
3. If picsum also fails (offline + uncached), show a category icon (e.g. 🍴 food, 🏛 monument, 🏖 beach) on a neutral surface

This ensures the user never sees a broken-image icon, even when external photo URLs go stale.

#### Scenario: Wikimedia URL 404
- **GIVEN** a place's `photos[0].src` points to a Wikimedia URL that returns 404
- **AND** `photos[0].fallback` is set to a picsum URL
- **WHEN** the card renders
- **THEN** the browser attempts the primary URL, fails
- **AND** swaps to the fallback URL automatically
- **AND** the user sees an image, never a broken-image icon

### Requirement: Place card visual hierarchy
A place card SHALL communicate importance at a glance:

- Priority dot top-left of hero image (8pt circle, color from `--color-priority-<id>`)
- Cost symbol bottom-left of hero (white pill, blurred bg)
- Hero photo lazy-loaded with blurhash placeholder
- State icon top-right of card (changes shape/color by state)
- Tag chips wrap, max 3 visible by default, "+N" pill if more
- Duration as small text below title; the proximity badge (see *City proximity badge*) is the only zone-derived visual on the card

State visual encoding:
| State | Card opacity | Border | Icon |
|---|---|---|---|
| untouched | 100% | none | ☆ |
| wishlist | 100% | none | ★ in `--color-state-wishlist` |
| scheduled | 100% | 2px `--color-state-scheduled` | 📅 |
| done | 70% | 2px `--color-state-done` dashed | ✓ |
| skipped | 50% (only if "show hidden") | none | ✕ |

### Requirement: Empty states & loading
Empty states SHALL be friendly, never apologetic, with one clear action:

- "Nothing here yet — try Surprise me 🎲"
- "Filters hide everything. Reset?"
- "No matches for 'rainforest'. Search again?"

Loading SHALL use skeleton screens, never spinners alone:
- Day list skeleton: 3 grey rows pulsing at `--color-surface-2`
- Card skeleton: rounded rect for hero + 2 text bars
- Skeleton SHALL fade out (120ms) when data arrives, content fades in (120ms)

### Requirement: Today's day banner
On any device tier, when the current date falls within the trip range, the day card for that date SHALL render with a "Today" pill badge in `--color-highlight`, and SHALL auto-scroll into view on first render.

#### Scenario: Today highlight
- **GIVEN** the user opens the app on `2026-05-18` (Day 7)
- **WHEN** the page renders
- **THEN** the Day 7 accordion is expanded
- **AND** a "🎂 Today — Raluca's birthday" badge is visible
- **AND** Day 7 is scrolled into view

### Requirement: Accessibility
- All interactive elements reachable via keyboard with visible focus rings (`outline: 2px solid var(--color-focus); outline-offset: 2px`)
- All images have meaningful `alt` text from `PhotoRef.alt`
- Color SHALL never be the only encoding (state has icon, priority has dot AND label in tooltip)
- Contrast ratios: 4.5:1 body, 3:1 large text & UI elements
- `aria-live="polite"` regions announce state changes ("Marked as wishlist")
- Slot scrollers expose left/right arrow buttons for keyboard users (not pure scroll)
- Reduced motion respected
- All forms (filter rail, search) keyboard-navigable with logical tab order

### Requirement: City proximity badge
Every place card SHALL surface a glanceable "how far is this from where I'm staying" badge derived from the place's `zone` and (optionally) its `homeBase`.

Format: `~<minutes>' <homeBaseLabel>` for zones tied to a home base; `~<minutes>'` (no label) for day-trip zones.

Examples: `~5' Málaga`, `~15' Tarifa`, `~30' Málaga`, `~1h`.

Zone-to-minutes mapping (pure function in `utils/zones.ts`):

| Zone id | Label produced |
|---|---|
| 1 | `~5'` |
| 2 | `~15'` |
| 3 | `~30'` |
| 4 | `~1h` |

The `<homeBaseLabel>` SHALL be resolved from the place's `homeBase` field via the trip's `homeBases[].label` (e.g. `"Málaga"`, `"Tarifa"`). Zone-4 places (day trips) SHALL NOT append a home-base label even if `homeBase` is set, because they are by definition not "near" any one stay.

If the zone is unknown (not 1–4) the badge SHALL be omitted entirely rather than shown empty. If the place has no `homeBase` (or it doesn't resolve), the badge SHALL fall back to the minutes-only form (`~5'`).

The badge SHALL appear:
- on `PlaceCard.vue` as a small chip prefixed with a clock icon, positioned where it does not compete with the priority dot or state controls. This badge is the **sole** zone-derived encoding on the card; it replaces the previously-required inline zone label/badge below the title.
- on `PlaceDetails.vue` as a short sentence near the top, e.g. `~15 minutes from your Tarifa stay` (or `~1 h day trip` for zone 4), giving the user the same information in plain prose.

#### Scenario: Zone 1 with home base
- **GIVEN** a place with `zone = 1` and `homeBase = "malaga-1"`
- **AND** the trip's `homeBases` contains `{ id: "malaga-1", label: "Málaga", ... }`
- **WHEN** the proximity label is computed
- **THEN** the result is `~5' Málaga`

#### Scenario: Zone 2 with home base
- **GIVEN** a place with `zone = 2` and `homeBase = "tarifa"`
- **AND** the trip's `homeBases` contains `{ id: "tarifa", label: "Tarifa", ... }`
- **WHEN** the proximity label is computed
- **THEN** the result is `~15' Tarifa`

#### Scenario: Zone 3 with home base
- **GIVEN** a place with `zone = 3` and `homeBase = "malaga-2"`
- **AND** the trip's `homeBases` contains `{ id: "malaga-2", label: "Málaga", ... }`
- **WHEN** the proximity label is computed
- **THEN** the result is `~30' Málaga`

#### Scenario: Zone 4 day trip drops home base
- **GIVEN** a place with `zone = 4` and `homeBase = "malaga-1"`
- **WHEN** the proximity label is computed
- **THEN** the result is `~1h` (no home-base suffix)

#### Scenario: Unknown zone yields no badge
- **GIVEN** a place with `zone = 99`
- **WHEN** the proximity label is computed
- **THEN** the result is the empty string and the UI omits the badge

### Requirement: Internationalization-readiness
The app does NOT ship with i18n in v1, but text SHALL NOT be hardcoded inside CSS or images. All user-facing strings live in component templates so a future change can extract them. The trip JSON's `language` field is reserved for future per-trip localization.
