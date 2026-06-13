import type { Gallery, LayoutSpec, Photo } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// DOM-DRIVEN GALLERY LAYOUT
//
// The gallery's layout lives in the DOM as invisible CSS-grid cells (rendered
// by GalleryPage); the WebGL scene mounts a plane per cell and tracks its rect
// every frame. This module owns both halves of that contract:
//
//   • buildGalleryBlocks() — turns a gallery into a deterministic sequence of
//     magazine-style blocks (header bands, grid clusters, full-screen breaks),
//     each cell carrying its CSS grid placement. À la monokai.nl/2019/japan.
//   • domGallery — the registry GalleryPage fills with mounted cell elements
//     and GalleryScene reads to know what to render where.
// ─────────────────────────────────────────────────────────────────────────────

export interface BlockCell {
  flatIndex: number
  photo: Photo
  /** CSS grid-column, e.g. '1 / 7' (12-column grid). */
  col: string
  /** CSS grid-row, for cells spanning stacked neighbours. */
  row?: string
  /** CSS aspect-ratio, e.g. '3 / 4'. */
  aspect: string
  /** Extra top offset (vh) — the stagger that breaks the grid's straight lines. */
  offsetVh: number
}

export type GalleryBlock =
  | { type: 'header'; flatIndex: number; text: string }
  | { type: 'full'; flatIndex: number; photo: Photo }
  | { type: 'cluster'; tight: boolean; cells: BlockCell[] }
  /** Trip route map: a sticky full-viewport cell before each chapter header.
   *  leg 0 fades the map in and reveals the first stop; leg k draws the
   *  journey from stop k-1 to stop k. */
  | { type: 'map'; flatIndex: number; leg: number }

/** Flat descriptor for every laid-out cell, parallel to the refs GalleryPage collects. */
export interface FlatCell {
  kind: 'photo' | 'header' | 'map'
  src?: string
  alt?: string
  text?: string
  leg?: number
  /** Header cells: index into gallery.sections (drives per-section palettes). */
  section?: number
}

/** Cells GalleryPage has mounted, consumed by GalleryScene. Bump the store's
 *  cellsVersion after writing so the canvas re-reads. */
export const domGallery = {
  cells: [] as (FlatCell & { el: HTMLElement })[],
}

function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FULL_EVERY: [number, number] = [3, 5] // clusters between full-screen breaks

type Orient = 'p' | 'l' | 's' // portrait | landscape | square-ish

/** Real aspect (w/h) of a photo; falls back to landscape when dimensions are
 *  unknown (a photo added before the next `npm run`/metadata rebuild). */
function aspectOf(p: Photo): number {
  const { width, height } = p.src
  return width && height ? width / height : 1.5
}
function orientOf(p: Photo): Orient {
  const a = aspectOf(p)
  return a <= 0.87 ? 'p' : a >= 1.15 ? 'l' : 's'
}
/** CSS aspect-ratio = the photo's OWN ratio, so the frame matches the image and
 *  GalleryPhoto's cover-crop becomes a no-op — no portrait jammed into a
 *  landscape frame, or vice versa. */
function aspectCss(p: Photo): string {
  return String(+aspectOf(p).toFixed(4))
}
type Place = 'center' | 'left' | 'right' | 'hero'
type PushPhoto = (photo: Photo) => number

function nextFullInterval(rng: () => number): number {
  return FULL_EVERY[0] + Math.floor(rng() * (FULL_EVERY[1] - FULL_EVERY[0] + 1))
}

/** Column spans for a row of photos: widths ∝ aspect so the frames share a
 *  height (justified-row style) and a portrait beside a landscape isn't dwarfed. */
function rowCols(ps: Photo[]): string[] {
  const weights = ps.map((p) => Math.min(2.2, Math.max(0.6, aspectOf(p))))
  const sum = weights.reduce((a, b) => a + b, 0)
  const minSpan = ps.length >= 5 ? 2 : 3
  const spans = weights.map((w) => Math.max(minSpan, Math.round((12 * w) / sum)))
  let total = spans.reduce((a, b) => a + b, 0)
  for (let guard = 0; total !== 12 && guard < 32; guard++) {
    if (total > 12) {
      const i = spans.indexOf(Math.max(...spans))
      if (spans[i] <= minSpan) break
      spans[i]--
    } else {
      spans[spans.indexOf(Math.min(...spans))]++
    }
    total = spans.reduce((a, b) => a + b, 0)
  }
  let c = 1
  return spans.map((s) => {
    const col = `${c} / ${c + s}`
    c += s
    return col
  })
}

/** One photo at its true aspect; column by orientation + requested placement. */
function singleBlock(p: Photo, place: Place, push: PushPhoto): GalleryBlock {
  const o = orientOf(p)
  const col =
    place === 'hero'
      ? o === 'p' ? '4 / 10' : o === 's' ? '3 / 11' : '2 / 12'
      : place === 'left'
        ? o === 'p' ? '1 / 6' : '1 / 8'
        : place === 'right'
          ? o === 'p' ? '8 / 13' : '6 / 13'
          : o === 'p' ? '5 / 9' : o === 's' ? '4 / 10' : '3 / 11'
  return {
    type: 'cluster',
    tight: false,
    cells: [{ flatIndex: push(p), photo: p, col, aspect: aspectCss(p), offsetVh: 0 }],
  }
}

function rowBlock(ps: Photo[], push: PushPhoto): GalleryBlock {
  const cols = rowCols(ps)
  return {
    type: 'cluster',
    tight: false,
    cells: ps.map((p, i) => ({ flatIndex: push(p), photo: p, col: cols[i], aspect: aspectCss(p), offsetVh: 0 })),
  }
}

function fullBlock(p: Photo, push: PushPhoto): GalleryBlock {
  return { type: 'full', flatIndex: push(p), photo: p }
}

/** Procedural magazine layout for one section's photos. `opener` makes the
 *  first photo a hero (true for a section's start, false for appended leftovers). */
function autoLayout(photos: Photo[], push: PushPhoto, rng: () => number, opener = true): GalleryBlock[] {
  const blocks: GalleryBlock[] = []
  let i = 0
  let groupStart = opener
  let untilFull = nextFullInterval(rng)
  while (i < photos.length) {
    const p = photos[i]
    const o = orientOf(p)
    if (groupStart) {
      blocks.push(singleBlock(p, 'hero', push))
      i++
      groupStart = false
      continue
    }
    // Full-screen break: landscape/square only — a portrait can't fill the
    // viewport without a brutal crop, so it waits for a landscape.
    if (untilFull <= 0 && o !== 'p') {
      untilFull = nextFullInterval(rng)
      blocks.push(fullBlock(p, push))
      i++
      continue
    }
    if (untilFull > 0) untilFull--
    const r = rng()
    const next = i + 1 < photos.length ? photos[i + 1] : null
    if (next && r < 0.42) {
      blocks.push(rowBlock([p, next], push))
      i += 2
    } else if (r < 0.72) {
      blocks.push(singleBlock(p, 'center', push))
      i++
    } else {
      blocks.push(singleBlock(p, rng() < 0.5 ? 'right' : 'left', push))
      i++
    }
  }
  return blocks
}

/** Hand-authored layout for one section (its layout.json). Photos are referenced
 *  by a substring of their filename; anything not listed is appended afterwards
 *  via autoLayout so nothing silently disappears. */
function manualLayout(spec: LayoutSpec, photos: Photo[], push: PushPhoto, rng: () => number): GalleryBlock[] {
  const blocks: GalleryBlock[] = []
  const used = new Set<number>()
  const resolve = (token: unknown): Photo | null => {
    const t = String(token).toLowerCase()
    const i = photos.findIndex((p, idx) => !used.has(idx) && (p.id ?? '').toLowerCase().includes(t))
    if (i < 0) {
      console.warn(`[gallery] layout: no unused photo matches "${token}"`)
      return null
    }
    used.add(i)
    return photos[i]
  }
  for (const entry of spec) {
    if (typeof entry === 'string') {
      const p = resolve(entry)
      if (p) blocks.push(singleBlock(p, 'center', push))
    } else if (Array.isArray(entry)) {
      const ps = entry.map(resolve).filter((p): p is Photo => !!p)
      if (ps.length === 1) blocks.push(singleBlock(ps[0], 'center', push))
      else if (ps.length) blocks.push(rowBlock(ps, push))
    } else if (entry && typeof entry === 'object') {
      if ('full' in entry) {
        const p = resolve(entry.full)
        if (p) blocks.push(fullBlock(p, push))
      } else if ('hero' in entry) {
        const p = resolve(entry.hero)
        if (p) blocks.push(singleBlock(p, 'hero', push))
      } else if ('photo' in entry) {
        const p = resolve(entry.photo)
        if (p) {
          const place = entry.place ?? 'center'
          blocks.push(place === 'full' ? fullBlock(p, push) : singleBlock(p, place, push))
        }
      }
    }
  }
  const rest = photos.filter((_, idx) => !used.has(idx))
  if (rest.length) {
    console.info(`[gallery] layout: ${rest.length} unlisted photo(s) appended via auto layout`)
    blocks.push(...autoLayout(rest, push, rng, false))
  }
  return blocks
}

export function buildGalleryBlocks(gallery: Gallery): { blocks: GalleryBlock[]; flat: FlatCell[] } {
  const photos = gallery.photos
  const rng = mulberry32(hashSeed(gallery.slug))
  const blocks: GalleryBlock[] = []
  const flat: FlatCell[] = []

  const push: PushPhoto = (photo) => {
    flat.push({ kind: 'photo', src: photo.src.src, alt: photo.alt })
    return flat.length - 1
  }
  const pushHeader = (text: string, section: number): number => {
    flat.push({ kind: 'header', text, section })
    return flat.length - 1
  }

  // Sections partition the photos; default to a single section under the title.
  const raw = gallery.sections?.length ? gallery.sections : [{ label: gallery.title, before: 0 }]
  const secs = raw
    .map((s) => ({ ...s, before: Math.max(0, Math.min(photos.length, s.before)) }))
    .sort((a, b) => a.before - b.before)
  if (secs[0].before !== 0) secs.unshift({ label: gallery.title, before: 0 })

  for (let s = 0; s < secs.length; s++) {
    const sec = secs[s]
    const start = sec.before
    const end = s + 1 < secs.length ? secs[s + 1].before : photos.length
    const slice = photos.slice(start, end)

    // Trip galleries: the route map returns before each chapter header,
    // travelling one leg to that chapter's stop.
    if (gallery.trip && s < gallery.trip.stops.length) {
      flat.push({ kind: 'map', leg: s })
      blocks.push({ type: 'map', flatIndex: flat.length - 1, leg: s })
    }
    blocks.push({ type: 'header', flatIndex: pushHeader(sec.label, s), text: sec.label })

    // Hand-authored layout if the section has one, else the magazine auto layout.
    blocks.push(...(sec.layout ? manualLayout(sec.layout, slice, push, rng) : autoLayout(slice, push, rng)))
  }

  return { blocks, flat }
}
