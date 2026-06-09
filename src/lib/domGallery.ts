import type { Gallery, Photo } from '../types'

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

/** Flat descriptor for every laid-out cell, parallel to the refs GalleryPage collects. */
export interface FlatCell {
  kind: 'photo' | 'header'
  src?: string
  alt?: string
  text?: string
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

export function buildGalleryBlocks(gallery: Gallery): { blocks: GalleryBlock[]; flat: FlatCell[] } {
  const photos = gallery.photos
  const rng = mulberry32(hashSeed(gallery.slug))
  const blocks: GalleryBlock[] = []
  const flat: FlatCell[] = []

  const pushPhoto = (photo: Photo): number => {
    flat.push({ kind: 'photo', src: photo.src.src, alt: photo.alt })
    return flat.length - 1
  }
  const pushHeader = (text: string): number => {
    flat.push({ kind: 'header', text })
    return flat.length - 1
  }

  // Section headers, mapped to the photo index they precede (always one at top).
  const sections =
    gallery.sections && gallery.sections.length
      ? [...gallery.sections]
      : [{ label: gallery.title, before: 0 }]
  const headerAt = new Map<number, string>()
  for (const s of sections) {
    const b = Math.max(0, Math.min(photos.length - 1, s.before))
    if (!headerAt.has(b)) headerAt.set(b, s.label)
  }
  if (!headerAt.has(0)) headerAt.set(0, gallery.title)

  const nextFullInterval = () =>
    FULL_EVERY[0] + Math.floor(rng() * (FULL_EVERY[1] - FULL_EVERY[0] + 1))

  let i = 0
  let groupStart = true
  let untilFull = nextFullInterval()
  while (i < photos.length) {
    if (headerAt.has(i)) {
      blocks.push({ type: 'header', flatIndex: pushHeader(headerAt.get(i)!), text: headerAt.get(i)! })
      headerAt.delete(i)
      groupStart = true
    }

    const nextHeader =
      [...headerAt.keys()].filter((k) => k > i).sort((a, b) => a - b)[0] ?? photos.length
    const left = nextHeader - i

    if (groupStart) {
      // Section opener: one big centered hero.
      blocks.push({
        type: 'cluster',
        tight: false,
        cells: [{ flatIndex: pushPhoto(photos[i]), photo: photos[i], col: '2 / 12', aspect: '3 / 2', offsetVh: 0 }],
      })
      i++
      groupStart = false
      continue
    }

    // Full-screen break: every few clusters one photo swallows the viewport.
    if (untilFull <= 0) {
      untilFull = nextFullInterval()
      blocks.push({ type: 'full', flatIndex: pushPhoto(photos[i]), photo: photos[i] })
      i++
      continue
    }
    untilFull--

    const r = rng()
    const flip = rng() < 0.5 // mirror the cluster horizontally

    if (left >= 3 && r < 0.3) {
      // 2+1 stack: two frames stacked in one column, a tall portrait in the
      // other spanning both rows, dropped a beat.
      const a: BlockCell = { flatIndex: pushPhoto(photos[i]), photo: photos[i], col: flip ? '7 / 13' : '1 / 7', row: '1', aspect: '4 / 3', offsetVh: 0 }
      const b: BlockCell = { flatIndex: pushPhoto(photos[i + 1]), photo: photos[i + 1], col: flip ? '7 / 13' : '1 / 7', row: '2', aspect: '1 / 1', offsetVh: 0 }
      const c: BlockCell = { flatIndex: pushPhoto(photos[i + 2]), photo: photos[i + 2], col: flip ? '1 / 7' : '7 / 13', row: '1 / 3', aspect: '3 / 4', offsetVh: 10 }
      blocks.push({ type: 'cluster', tight: true, cells: [a, b, c] })
      i += 3
    } else if (left >= 2 && r < 0.65) {
      // Edge pair: portrait one side, landscape the other, staggered.
      const a: BlockCell = { flatIndex: pushPhoto(photos[i]), photo: photos[i], col: flip ? '8 / 13' : '1 / 6', row: '1', aspect: '3 / 4', offsetVh: 0 }
      const b: BlockCell = { flatIndex: pushPhoto(photos[i + 1]), photo: photos[i + 1], col: flip ? '1 / 8' : '6 / 13', row: '1', aspect: '3 / 2', offsetVh: 12 + Math.round(rng() * 10) }
      blocks.push({ type: 'cluster', tight: false, cells: [a, b] })
      i += 2
    } else if (r < 0.85) {
      // Centered single — landscape mostly, occasionally a portrait.
      const portrait = rng() < 0.3
      blocks.push({
        type: 'cluster',
        tight: false,
        cells: [{
          flatIndex: pushPhoto(photos[i]),
          photo: photos[i],
          col: portrait ? '5 / 9' : '3 / 11',
          aspect: portrait ? '3 / 4' : '4 / 3',
          offsetVh: 0,
        }],
      })
      i++
    } else {
      // Edge single: flush to one side, the rest left as paper.
      blocks.push({
        type: 'cluster',
        tight: false,
        cells: [{
          flatIndex: pushPhoto(photos[i]),
          photo: photos[i],
          col: flip ? '6 / 13' : '1 / 8',
          aspect: '3 / 2',
          offsetVh: 0,
        }],
      })
      i++
    }
  }

  return { blocks, flat }
}
