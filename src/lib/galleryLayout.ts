import type { Gallery, Photo } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// GALLERY LAYOUT ENGINE
//
// Turns a gallery into an asymmetric, staggered editorial cascade (à la
// monokai.nl/2019/japan) — section headers, full-width heroes, offset L/R pairs,
// centered singles — with generous negative space. Deterministic per gallery
// (seeded by slug). Photos sit in a strict two-column grid (with a center
// gutter) so frames NEVER overlap. Any photo can override its placement.
//
// Output is in WORLD UNITS, sized against the live viewport, so it's responsive.
// Frames have fixed aspects; images cover-crop to fill them.
// ─────────────────────────────────────────────────────────────────────────────

export interface LaidOutItem {
  type: 'photo' | 'header'
  index: number
  x: number
  y: number
  width: number
  height: number
  photo?: Photo
  text?: string
}

export interface GalleryLayout {
  items: LaidOutItem[]
  scrollRange: number
}

// Tunable rhythm (fractions of usable width / viewport height).
const SIDE_MARGIN = 0.07 // empty margin each side of the column
const CENTER_GUTTER = 0.05 // gap between the two columns (keeps pairs apart)
const GAP = 0.2 // breathing room between photo rows (× viewport height)
const HEADER_H = 0.32 // header band height (× viewport height)
const HEADER_GAP = 0.12 // gap after a header (× viewport height)
const TOP_INSET = 0.12 // where the first row's top sits below the viewport top
const STAGGER = 0.24 // how far the second item in a pair drops (× viewport height)

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

export function layoutGallery(gallery: Gallery, viewW: number, viewH: number): GalleryLayout {
  const photos = gallery.photos
  const rng = mulberry32(hashSeed(gallery.slug))

  const usableW = viewW * (1 - SIDE_MARGIN * 2)
  const gutter = usableW * CENTER_GUTTER
  const halfW = (usableW - gutter) / 2 // width of one column
  const halfCenter = (usableW + gutter) / 4 // x-distance from center to a column's center
  const gap = viewH * GAP
  const stagger = viewH * STAGGER

  const items: LaidOutItem[] = []
  let cursor = 0 // world y of the top edge of the next row (placed downward)
  let key = 0

  // Place a frame; returns the world y of its bottom edge.
  const place = (
    type: LaidOutItem['type'],
    width: number,
    height: number,
    x: number,
    drop: number,
    photo?: Photo,
    text?: string,
  ): number => {
    const topY = cursor - drop
    items.push({ type, index: key++, x, y: topY - height / 2, width, height, photo, text })
    return topY - height
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

  let i = 0
  let groupStart = true // first photo after a header opens with a hero
  while (i < photos.length) {
    // A section header lands before this photo.
    if (headerAt.has(i)) {
      const bottom = place(
        'header',
        usableW,
        viewH * HEADER_H,
        0,
        i === 0 ? 0 : viewH * 0.05,
        undefined,
        headerAt.get(i),
      )
      headerAt.delete(i)
      cursor = bottom - viewH * HEADER_GAP
      groupStart = true
    }

    const photo = photos[i]
    const nextHeader =
      [...headerAt.keys()].filter((k) => k > i).sort((a, b) => a - b)[0] ?? photos.length
    const photosLeftInGroup = nextHeader - i

    // Manual override → place exactly as specified, single row.
    if (photo.layout && (photo.layout.width || photo.layout.aspect || photo.layout.column)) {
      const col = photo.layout.column ?? 'center'
      const aspect = photo.layout.aspect ?? 1.4
      if (col === 'full') {
        const w = usableW * (photo.layout.width ?? 1)
        cursor = place('photo', w, w / aspect, 0, 0, photo) - gap
      } else if (col === 'left' || col === 'right') {
        const w = halfW * (photo.layout.width ?? 0.92)
        cursor = place('photo', w, w / aspect, col === 'left' ? -halfCenter : halfCenter, 0, photo) - gap
      } else {
        const w = usableW * (photo.layout.width ?? 0.62)
        cursor = place('photo', w, w / aspect, 0, 0, photo) - gap
      }
      i++
      groupStart = false
      continue
    }

    if (groupStart) {
      // Open the group with a full-width hero.
      const w = usableW
      cursor = place('photo', w, w / 1.5, 0, 0, photo) - gap
      i++
      groupStart = false
      continue
    }

    const r = rng()
    if (photosLeftInGroup >= 2 && r < 0.5) {
      // Staggered L/R pair — each strictly inside its own column, so no overlap.
      const lW = halfW * 0.94
      const rW = halfW * 0.88
      const lb = place('photo', lW, lW / 0.72, -halfCenter, 0, photos[i]) // portrait, left
      const rb = place('photo', rW, rW / 1.4, halfCenter, stagger, photos[i + 1]) // landscape, dropped
      cursor = Math.min(lb, rb) - gap
      i += 2
    } else if (r < 0.78) {
      // Centered single.
      const w = usableW * 0.62
      cursor = place('photo', w, w / 1.3, 0, 0, photos[i]) - gap
      i++
    } else {
      // Offset single in one column, leaving the other side as negative space.
      const left = rng() < 0.5
      const w = halfW * 0.92
      const aspect = left ? 0.72 : 1.5
      cursor = place('photo', w, w / aspect, left ? -halfCenter : halfCenter, 0, photos[i]) - gap
      i++
    }
  }

  // Shift so the first row's top sits just below the viewport top.
  const contentTop = viewH / 2 - viewH * TOP_INSET
  for (const it of items) it.y += contentTop

  const contentBottom = items.reduce((m, it) => Math.min(m, it.y - it.height / 2), contentTop)
  const scrollRange = Math.max(0, contentTop - contentBottom - viewH + viewH * TOP_INSET)

  return { items, scrollRange }
}
