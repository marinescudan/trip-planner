# Source of truth specs

This directory is intentionally empty in v1.

OpenSpec splits specs into two locations:
- `openspec/specs/` — current behavior (the "source of truth")
- `openspec/changes/<id>/specs/` — proposed changes (deltas)

When a change is implemented and `openspec archive` is run, its delta specs merge here.

Until then, the active change `openspec/changes/init-trip-planner/specs/` IS the specification.
