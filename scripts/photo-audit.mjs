/* eslint-disable */
/**
 * Photo audit (task 11.2): for every `must`-priority place that is NOT
 * logistics/transit, check that `photos[0].src` is a real hero (i.e. not a
 * `picsum.photos` placeholder) and not missing.
 *
 * Logistics + transit places are exempt — they don't need imagery and
 * generally won't have Wikimedia entries.
 *
 * Usage: `node scripts/photo-audit.mjs <path>`
 * Exits non-zero if any offenders remain.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const EXEMPT_TYPES = new Set(['logistics', 'transit'])

const arg = process.argv[2] ?? 'public/trip.json'
const trip = JSON.parse(readFileSync(resolve(process.cwd(), arg), 'utf8'))
const must = trip.places.filter(
  p => p.priority === 'must' && !EXEMPT_TYPES.has(p.type),
)

const noHero = []
const placeholder = []
for (const p of must) {
  const src = p.photos?.[0]?.src
  if (!src) {
    noHero.push(p)
  } else if (/picsum\.photos/i.test(src)) {
    placeholder.push(p)
  }
}

const real = must.length - noHero.length - placeholder.length

console.log(`must-priority places (excl. logistics/transit): ${must.length}`)
console.log(`  with real hero: ${real}`)
console.log(`  with picsum placeholder: ${placeholder.length}`)
console.log(`  without any photo: ${noHero.length}`)

if (placeholder.length) {
  console.log('\nPicsum offenders:')
  for (const p of placeholder) {
    console.log(`  ${p.id} — ${p.name}\n      ${p.photos[0].src}`)
  }
}
if (noHero.length) {
  console.log('\nNo-photo offenders:')
  for (const p of noHero) {
    console.log(`  ${p.id} — ${p.name}`)
  }
}

process.exit(noHero.length + placeholder.length > 0 ? 1 : 0)
