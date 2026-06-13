// Generator for src/content/section-palettes.json — per-folder colour palettes
// derived from the actual photos. The gallery's section backgrounds fall back
// to these when a chapter has no hand-authored theme in galleries.config.ts.
//
//   node scripts/build-section-palettes.mjs        (or: npm run palettes)
//
// Approach: median-cut each folder's images into a ranked palette (by pixel
// population). The PRIMARY colour of a photo set is usually a dull neutral
// (shadow, sky, asphalt), so the background hue is taken from the most
// chromatic of the SECONDARY/TERTIARY swatches — then normalised to a usable
// backdrop luminance (dark or light, decided by the set's overall brightness)
// while keeping that hue. The accent is the punchiest mid-tone swatch.
import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname } from 'node:path'
import sharp from 'sharp'

const ROOT = dirname(fileURLToPath(import.meta.url))
const PHOTOS = join(ROOT, '../src/photos')
const OUT = join(ROOT, '../src/content/section-palettes.json')

const IMG = /\.(jpe?g|png|webp|avif)$/i
const SAMPLE = 72 // px each image is resized to before sampling
const BOXES = 6 // palette size (median-cut)
// Base lightness of derived DARK backgrounds (the single dial for "darker vs
// lighter overall"). ~0.30 reads as a present, clearly-coloured backdrop;
// lower it toward 0.20 for moodier, raise toward 0.40 for airier.
const DARK_BG_L = 0.3
// Day/night split: photo sets averaging darker than this get a dark theme,
// brighter (daytime) sets get a light one. Night street sets land ~0.22–0.33;
// daytime sets sit higher, so ~0.36 cleanly separates them.
const NIGHT_MAX_L = 0.36

// ── colour helpers (all channels 0..1 unless noted) ─────────────────────────
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h /= 6
    if (h < 0) h += 1
  }
  const l = (max + min) / 2
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  return [h, s, l]
}
function hslToRgb(h, s, l) {
  if (s === 0) return [l, l, l]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const t = (n) => {
    if (n < 0) n += 1
    if (n > 1) n -= 1
    if (n < 1 / 6) return p + (q - p) * 6 * n
    if (n < 1 / 2) return q
    if (n < 2 / 3) return p + (q - p) * (2 / 3 - n) * 6
    return p
  }
  return [t(h + 1 / 3), t(h), t(h - 1 / 3)]
}
const hex = (r, g, b) =>
  '#' + [r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')

// ── median-cut quantiser ─────────────────────────────────────────────────────
function medianCut(samples /* Uint8Array, 3 per px */, target) {
  const n = samples.length / 3
  let boxes = [Array.from({ length: n }, (_, i) => i)]
  const rangeOf = (idx) => {
    const lo = [255, 255, 255], hi = [0, 0, 0]
    for (const i of idx)
      for (let c = 0; c < 3; c++) {
        const v = samples[i * 3 + c]
        if (v < lo[c]) lo[c] = v
        if (v > hi[c]) hi[c] = v
      }
    return [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]]
  }
  while (boxes.length < target) {
    // Split the box with the largest population × colour spread.
    let bi = -1, best = -1
    boxes.forEach((idx, i) => {
      if (idx.length < 2) return
      const r = rangeOf(idx)
      const score = idx.length * Math.max(r[0], r[1], r[2])
      if (score > best) { best = score; bi = i }
    })
    if (bi < 0) break
    const idx = boxes[bi]
    const r = rangeOf(idx)
    const axis = r[0] >= r[1] && r[0] >= r[2] ? 0 : r[1] >= r[2] ? 1 : 2
    idx.sort((a, b) => samples[a * 3 + axis] - samples[b * 3 + axis])
    const mid = idx.length >> 1
    boxes.splice(bi, 1, idx.slice(0, mid), idx.slice(mid))
  }
  return boxes
    .map((idx) => {
      let r = 0, g = 0, b = 0
      for (const i of idx) { r += samples[i * 3]; g += samples[i * 3 + 1]; b += samples[i * 3 + 2] }
      const k = idx.length
      return { r: r / k / 255, g: g / k / 255, b: b / k / 255, frac: k / n }
    })
    .sort((a, b) => b.frac - a.frac)
}

// ── derive a usable {bg, fg, accent} triad from a ranked palette ─────────────
function derive(ranked) {
  const withHsl = ranked.map((c) => {
    const [h, s, l] = rgbToHsl(c.r, c.g, c.b)
    return { ...c, h, s, l, chroma: Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) }
  })

  // Overall brightness (population-weighted) decides light vs dark theme.
  const meanL = withHsl.reduce((a, c) => a + c.l * c.frac, 0)
  const dark = meanL < NIGHT_MAX_L

  // Background hue: normally the more chromatic of the secondary/tertiary
  // swatches (skip the primary, usually a flat neutral). BUT if some swatch is
  // dramatically more vivid than that — a red lantern blazing on a dark alley,
  // where the cool background wins on pixel-count but the lantern is the
  // chapter's character — let the vivid colour own the background instead.
  const sec = withHsl.slice(1, 3)
  const domSec = (sec.length ? sec : withHsl).reduce((a, c) => (c.chroma > a.chroma ? c : a))
  const nonPrimary = withHsl.length > 1 ? withHsl.slice(1) : withHsl
  const vivid = nonPrimary.reduce((a, c) => (c.chroma > a.chroma ? c : a))
  const basis = vivid.chroma >= domSec.chroma * 3 ? vivid : domSec

  // Accent: punchiest mid-tone swatch in the whole palette (not near-black /
  // near-white, where high HSL-saturation reads as muddy).
  const mid = withHsl.filter((c) => c.l > 0.16 && c.l < 0.9)
  const accentSrc = (mid.length ? mid : withHsl).reduce((a, c) => (c.chroma > a.chroma ? c : a))

  // Keep each swatch's hue, force luminance/saturation into a legible range.
  // Dark themes lift to DARK_BG_L + a little of the basis's own lightness, so
  // the backdrop is a present, clearly-coloured surround (~L 0.30–0.40) with
  // healthy saturation — enough contrast against the dark night photos and an
  // obvious hue, not a murky near-black tint.
  const bgL = dark ? DARK_BG_L + basis.l * 0.1 : 0.9 - (1 - basis.l) * 0.06
  const bgS = dark ? clamp(basis.s * 1.2, 0.38, 0.52) : Math.min(basis.s, 0.5)
  const bg = hslToRgb(basis.h, bgS, bgL)
  const fg = dark
    ? hslToRgb(basis.h, 0.1, 0.93)
    : hslToRgb(basis.h, 0.14, 0.13)
  const accent = hslToRgb(
    accentSrc.h,
    Math.min(Math.max(accentSrc.s, 0.45), 0.8),
    dark ? 0.58 : 0.46,
  )
  return {
    bg: hex(...bg),
    fg: hex(...fg),
    accent: hex(...accent),
    polarity: dark ? 'dark' : 'light',
    ranked: ranked.map((c) => ({ hex: hex(c.r, c.g, c.b), frac: +c.frac.toFixed(3) })),
  }
}

async function paletteForFolder(dir) {
  const files = readdirSync(dir).filter((f) => IMG.test(f))
  if (!files.length) return null
  const chunks = []
  let total = 0
  for (const f of files) {
    const { data, info } = await sharp(join(dir, f))
      .resize(SAMPLE, SAMPLE, { fit: 'inside' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    // info.channels is 3 after removeAlpha.
    chunks.push(data)
    total += (info.width * info.height)
  }
  const all = new Uint8Array(total * 3)
  let o = 0
  for (const c of chunks) { all.set(c, o); o += c.length }
  return derive(medianCut(all, BOXES))
}

// ── walk src/photos/<slug>/[<chapter>/] ──────────────────────────────────────
const out = {}
for (const slug of readdirSync(PHOTOS)) {
  const slugDir = join(PHOTOS, slug)
  if (!statSync(slugDir).isDirectory()) continue
  const entries = readdirSync(slugDir)
  const subdirs = entries.filter((e) => statSync(join(slugDir, e)).isDirectory())
  if (subdirs.length) {
    for (const sub of subdirs) {
      const id = sub.replace(/^\d+[-_]?/, '') // '04-fukuoka' -> 'fukuoka'
      const pal = await paletteForFolder(join(slugDir, sub))
      if (pal) out[`${slug}/${id}`] = pal
    }
  } else if (entries.some((e) => IMG.test(extname(e)))) {
    const pal = await paletteForFolder(slugDir)
    if (pal) out[slug] = pal
  }
}

writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
for (const [k, p] of Object.entries(out))
  console.log(
    `${k.padEnd(20)} ${p.polarity.padEnd(5)} bg ${p.bg}  fg ${p.fg}  accent ${p.accent}` +
      `   ranked ${p.ranked.map((r) => r.hex).join(' ')}`,
  )
console.log(`\nwrote ${Object.keys(out).length} palettes → src/content/section-palettes.json`)
