/* eslint-disable */
/**
 * Generate PWA icons (192, 512, 512-maskable) and apple-touch-icon (180)
 * as solid-fill PNGs with a centred geometric "T" mark, using only
 * Node's built-in `zlib` + `Buffer` — no sharp / resvg / canvas dep.
 *
 * Run once: `node scripts/generate-icons.mjs`. Output is committed under
 * `public/icons/`. Re-run after editing the colour palette.
 *
 * Source of truth:
 *   openspec/changes/init-trip-planner/specs/pwa/spec.md (Installable;
 *   Theme color & status bar)
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(HERE, '..', 'public', 'icons')

// Trip-default theme — see specs/pwa/spec.md "Theme color & status bar".
const COLOR_BG = [0xfe, 0xfc, 0xf9] // --color-bg warm off-white
const COLOR_PRIMARY = [0x03, 0x69, 0xa1] // --color-primary deep sea
const COLOR_ACCENT = [0xc2, 0x41, 0x0c] // --color-accent terracotta

/** Maskable icons need a 10% safe-area padding inside the visible canvas. */
const MASKABLE_PADDING = 0.1

// All function declarations are hoisted, but the `const` IIFE for `_crcTable`
// at the bottom is not — so the actual entry-point lives at the end of file.

// ---------------------------------------------------------------------------

/**
 * Render a flat-design icon: rounded primary square as the badge, a
 * stylised serif "T" in accent, a single dot at the cross-bar tip to
 * suggest a pin / destination marker.
 */
function writePng(size, maskable, filename) {
  const pixels = new Uint8Array(size * size * 4)
  // Fill background.
  fillRect(pixels, size, 0, 0, size, size, COLOR_BG, 0xff)

  // The "drawable" inset area — for maskable, shrink so safe area survives a
  // circular crop. Non-maskable uses the full canvas (no inset).
  const inset = maskable ? Math.round(size * MASKABLE_PADDING) : 0
  const drawSize = size - inset * 2

  // Outer rounded primary square with subtle radius.
  const radius = Math.round(drawSize * 0.18)
  fillRoundedRect(
    pixels,
    size,
    inset,
    inset,
    drawSize,
    drawSize,
    radius,
    COLOR_PRIMARY,
    0xff,
  )

  // Stylised T:
  //   horizontal bar  — width = 60% of drawSize, height = 12% of drawSize
  //   vertical stem   — width = 14% of drawSize, height = 50% of drawSize
  const barW = Math.round(drawSize * 0.6)
  const barH = Math.round(drawSize * 0.12)
  const stemW = Math.round(drawSize * 0.14)
  const stemH = Math.round(drawSize * 0.5)
  const cx = inset + Math.round(drawSize / 2)
  const topY = inset + Math.round(drawSize * 0.28)

  fillRect(pixels, size, cx - Math.round(barW / 2), topY, barW, barH, COLOR_BG, 0xff)
  fillRect(pixels, size, cx - Math.round(stemW / 2), topY + barH, stemW, stemH, COLOR_BG, 0xff)

  // Pin dot at the bottom of the stem in accent colour.
  const dotR = Math.round(drawSize * 0.07)
  fillCircle(pixels, size, cx, topY + barH + stemH + dotR, dotR, COLOR_ACCENT, 0xff)

  const png = encodePng(size, size, pixels)
  writeFileSync(resolve(OUT_DIR, filename), png)
}

function fillRect(buf, stride, x, y, w, h, [r, g, b], a) {
  for (let yy = Math.max(0, y); yy < Math.min(stride, y + h); yy++) {
    for (let xx = Math.max(0, x); xx < Math.min(stride, x + w); xx++) {
      const o = (yy * stride + xx) * 4
      buf[o] = r
      buf[o + 1] = g
      buf[o + 2] = b
      buf[o + 3] = a
    }
  }
}

function fillRoundedRect(buf, stride, x, y, w, h, radius, color, a) {
  const r = Math.min(radius, Math.floor(Math.min(w, h) / 2))
  // Centre band (full width, no rounding).
  fillRect(buf, stride, x, y + r, w, h - 2 * r, color, a)
  // Top + bottom bands (no corners yet).
  fillRect(buf, stride, x + r, y, w - 2 * r, r, color, a)
  fillRect(buf, stride, x + r, y + h - r, w - 2 * r, r, color, a)
  // Four rounded corners.
  fillCornerArc(buf, stride, x + r, y + r, r, color, a, -1, -1)
  fillCornerArc(buf, stride, x + w - r - 1, y + r, r, color, a, +1, -1)
  fillCornerArc(buf, stride, x + r, y + h - r - 1, r, color, a, -1, +1)
  fillCornerArc(buf, stride, x + w - r - 1, y + h - r - 1, r, color, a, +1, +1)
}

function fillCornerArc(buf, stride, cx, cy, r, [cr, cg, cb], a, dx, dy) {
  for (let yy = 0; yy <= r; yy++) {
    for (let xx = 0; xx <= r; xx++) {
      if (xx * xx + yy * yy <= r * r) {
        const px = cx + dx * xx
        const py = cy + dy * yy
        if (px < 0 || py < 0 || px >= stride) continue
        const o = (py * stride + px) * 4
        buf[o] = cr
        buf[o + 1] = cg
        buf[o + 2] = cb
        buf[o + 3] = a
      }
    }
  }
}

function fillCircle(buf, stride, cx, cy, r, [cr, cg, cb], a) {
  for (let yy = -r; yy <= r; yy++) {
    for (let xx = -r; xx <= r; xx++) {
      if (xx * xx + yy * yy <= r * r) {
        const px = cx + xx
        const py = cy + yy
        if (px < 0 || py < 0 || px >= stride) continue
        const o = (py * stride + px) * 4
        buf[o] = cr
        buf[o + 1] = cg
        buf[o + 2] = cb
        buf[o + 3] = a
      }
    }
  }
}

// --- minimal PNG encoder ---------------------------------------------------
//
// PNG = signature + IHDR + IDAT + IEND. Each non-signature chunk:
//   length(4 BE) + type(4) + data(N) + crc32(4 BE).
// IDAT carries zlib-compressed scanlines, each prefixed with a filter byte
// (0 = None — we use that for every row).

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr.writeUInt8(8, 8) // bit depth
  ihdr.writeUInt8(6, 9) // colour type: RGBA
  ihdr.writeUInt8(0, 10) // compression
  ihdr.writeUInt8(0, 11) // filter
  ihdr.writeUInt8(0, 12) // interlace

  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter type: None
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1)
  }
  const idat = deflateSync(raw, { level: 9 })

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcInput = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcInput) >>> 0, 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

const _crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = _crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// --- entry point -----------------------------------------------------------

mkdirSync(OUT_DIR, { recursive: true })

writePng(192, false, 'icon-192.png')
writePng(512, false, 'icon-512.png')
writePng(512, true, 'icon-maskable-512.png')
writePng(180, false, 'apple-touch-icon.png')

console.log(`✔ Wrote 4 icons to ${OUT_DIR}`)
