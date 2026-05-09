#!/usr/bin/env tsx
/**
 * CLI: `pnpm validate-trip <path>` — validates a trip JSON file against the
 * v1.0 schema (structural + cross-field). Exits 0 on success, 1 on failure
 * with a humanised list of issues.
 *
 * Used by:
 *   - the `pnpm validate-trip` script in package.json
 *   - Phase 11 verification (task 11.1)
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/trip-schema/spec.md
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

import { validateTripJson } from '../utils/schema'

function main(): void {
  const arg = process.argv[2]
  if (!arg) {
    process.stderr.write('usage: pnpm validate-trip <path-to-trip.json>\n')
    process.exit(1)
  }

  const path = resolve(process.cwd(), arg)
  let raw: string
  try {
    raw = readFileSync(path, 'utf8')
  }
  catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    process.stderr.write(`✘ Cannot read ${path}\n  ${message}\n`)
    process.exit(1)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  }
  catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    process.stderr.write(`✘ Invalid JSON in ${path}\n  ${message}\n`)
    process.exit(1)
  }

  const result = validateTripJson(parsed)
  if (!result.ok) {
    process.stderr.write(`✘ ${result.errors.length} validation issue(s) in ${arg}:\n`)
    for (const issue of result.errors) {
      const where = issue.path.length > 0 ? issue.path.join('.') : '<root>'
      process.stderr.write(`  • [${where}] ${issue.message}\n`)
    }
    process.exit(1)
  }

  const t = result.trip
  process.stdout.write(
    `✔ ${arg} valid — `
    + `id=${t.trip.id}, title="${t.trip.title}", `
    + `${t.days.length} days, ${t.places.length} places\n`,
  )
}

main()
