import type { Gallery, GallerySection, GalleryTheme, LayoutSpec, Photo } from '../types'
import { galleryMeta, DEFAULT_THEME, type GalleryMeta } from './galleries.config'
import sectionPalettes from './section-palettes.json'

// Photo-derived palettes (scripts/build-section-palettes.mjs), keyed by
// '<slug>/<chapterId>' for chaptered galleries and '<slug>' for flat ones. A
// section uses its hand-authored theme if present, else falls back to these.
type DerivedPalette = { bg: string; fg: string; accent: string }
const palettes = sectionPalettes as Record<string, DerivedPalette>
function derivedTheme(key: string): GalleryTheme | undefined {
  const p = palettes[key]
  return p ? { bg: p.bg, fg: p.fg, accent: p.accent } : undefined
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-DISCOVERED CONTENT
//
// Drop image files into src/photos/<slug>/ and they appear here automatically:
//   • a file named cover.* becomes the gallery cover (else the first image)
//   • the rest become the gallery, in filename order (so 01.jpg, 02.jpg, …)
//   • alt text is derived from the filename
//   • aspect ratios are read from the images at runtime — no need to measure
//
// Trip/chaptered galleries use one more folder level:
//   src/photos/<slug>/01-tokyo/…  src/photos/<slug>/02-sapporo/…
// Chapters run in folder order (hence the numeric prefix) and each becomes a
// section, headed by the matching trip stop's label (galleries.config.ts) —
// no hand-maintained `before:` indices. cover.* still lives at the slug root.
//
// Human metadata (title/intro/theme/order) lives in galleries.config.ts. Nothing
// in the app imports this file directly — everything goes through lib/content.ts,
// so this can later become a CMS adapter with no other changes.
// ─────────────────────────────────────────────────────────────────────────────

// Vite inlines these globs at build time. vite-imagetools resizes every image
// to a ~webp and `as: metadata` returns { src, width, height } — so the layout
// engine knows each photo's real orientation (and never crops a portrait into a
// landscape frame, or vice versa) with zero extra build step.
// (Options must be static literals — Vite can't resolve a shared const here.)
type ImgMeta = { src: string; width: number; height: number }
// w+h+fit:inside caps the LONG edge at 2560 (so a portrait is ~1707×2560, not
// 2560×3840) — crisp on retina/full-screen without over-serving. Never upscales.
const rootFiles = import.meta.glob('../photos/*/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  import: 'default',
  query: { w: '2560', h: '2560', fit: 'inside', format: 'webp', quality: '80', as: 'metadata' },
}) as Record<string, ImgMeta>
const chapterFiles = import.meta.glob('../photos/*/*/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  import: 'default',
  query: { w: '2560', h: '2560', fit: 'inside', format: 'webp', quality: '80', as: 'metadata' },
}) as Record<string, ImgMeta>

// Optional `layout.json` sidecars for hand-authored art direction: at a chapter
// folder (keyed '<slug>/<dir>') or a flat gallery root (keyed '<slug>').
const rootLayoutFiles = import.meta.glob('../photos/*/layout.json', { eager: true, import: 'default' })
const chapterLayoutFiles = import.meta.glob('../photos/*/*/layout.json', { eager: true, import: 'default' })
const rootLayouts: Record<string, LayoutSpec> = {}
for (const path in rootLayoutFiles) {
  const m = path.match(/\/photos\/([^/]+)\/layout\.json$/)
  if (m) rootLayouts[m[1]] = rootLayoutFiles[path] as LayoutSpec
}
const chapterLayouts: Record<string, LayoutSpec> = {}
for (const path in chapterLayoutFiles) {
  const m = path.match(/\/photos\/([^/]+)\/([^/]+)\/layout\.json$/)
  if (m) chapterLayouts[`${m[1]}/${m[2]}`] = chapterLayoutFiles[path] as LayoutSpec
}

function humanize(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

/** '01-tokyo' → 'tokyo' (the id trip stops and chapter labels key on). */
function chapterId(dir: string): string {
  return dir.replace(/^\d+[-_]?/, '')
}

type Entry = { name: string; url: string; w: number; h: number }
const byName = (a: Entry, b: Entry) => a.name.localeCompare(b.name)

// Group discovered images by gallery slug (and chapter dir, if nested).
const bySlug = new Map<string, Entry[]>()
for (const path in rootFiles) {
  const m = path.match(/\/photos\/([^/]+)\/([^/]+)$/)
  if (!m) continue
  const [, slug, name] = m
  const meta = rootFiles[path]
  const list = bySlug.get(slug) ?? []
  list.push({ name, url: meta.src, w: meta.width, h: meta.height })
  bySlug.set(slug, list)
}
const byChapter = new Map<string, Map<string, Entry[]>>()
for (const path in chapterFiles) {
  const m = path.match(/\/photos\/([^/]+)\/([^/]+)\/([^/]+)$/)
  if (!m) continue
  const [, slug, dir, name] = m
  const meta = chapterFiles[path]
  const chapters = byChapter.get(slug) ?? new Map<string, Entry[]>()
  const list = chapters.get(dir) ?? []
  list.push({ name, url: meta.src, w: meta.width, h: meta.height })
  chapters.set(dir, list)
  byChapter.set(slug, chapters)
}

function toPhoto(e: Entry): Photo {
  return {
    id: e.name.replace(/\.[^.]+$/, ''),
    src: { src: e.url, width: e.w, height: e.h },
    alt: humanize(e.name),
    reveal: 'pixelate',
  }
}

function buildGallery(slug: string, meta?: GalleryMeta): Gallery | null {
  const rootEntries = (bySlug.get(slug) ?? []).sort(byName)
  const chapters = byChapter.get(slug)

  let photos: Photo[]
  let sections: GallerySection[] | undefined = meta?.sections
  let cover = rootEntries.find((e) => /^cover\./i.test(e.name))

  if (chapters && chapters.size > 0) {
    // Chaptered gallery: concatenate chapters in folder order, opening each
    // with a section header (trip stop label > chapters override > folder name).
    photos = []
    sections = []
    for (const dir of [...chapters.keys()].sort()) {
      const entries = chapters.get(dir)!.sort(byName)
      if (entries.length === 0) continue
      const id = chapterId(dir)
      const stop = meta?.trip?.stops.find((s) => s.id === id)
      const label = stop?.label ?? meta?.chapters?.[id] ?? humanize(id)
      const theme = stop?.theme ?? derivedTheme(`${slug}/${id}`)
      const layout = chapterLayouts[`${slug}/${dir}`]
      sections.push({ label, before: photos.length, theme, layout })
      photos.push(...entries.map(toPhoto))
    }
  } else {
    const source = rootEntries.filter((e) => e !== cover)
    photos = (source.length > 0 ? source : rootEntries).map(toPhoto)
    // Flat gallery: a root layout.json becomes the (single) section's layout.
    if (!sections && rootLayouts[slug]) {
      sections = [{ label: meta?.title ?? humanize(slug), before: 0, layout: rootLayouts[slug] }]
    }
  }

  if (photos.length === 0) return null
  cover ??= rootEntries[0]

  return {
    slug,
    title: meta?.title ?? humanize(slug),
    intro: meta?.intro,
    sections,
    trip: meta?.trip,
    cover: { src: cover?.url ?? photos[0].src.src },
    theme: meta?.theme ?? DEFAULT_THEME,
    photos,
  }
}

// Configured galleries first (in config order)…
const configured = galleryMeta
  .map((m) => buildGallery(m.slug, m))
  .filter((g): g is Gallery => g !== null)

// …then any folders that have images but no config entry (default theme).
const configuredSlugs = new Set(galleryMeta.map((m) => m.slug))
const extras = [...new Set([...bySlug.keys(), ...byChapter.keys()])]
  .filter((slug) => !configuredSlugs.has(slug))
  .sort()
  .map((slug) => buildGallery(slug))
  .filter((g): g is Gallery => g !== null)

export const galleries: Gallery[] = [...configured, ...extras]
