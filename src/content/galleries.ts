import type { Gallery, GalleryTheme, Photo } from '../types'
import { galleryMeta, DEFAULT_THEME } from './galleries.config'

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-DISCOVERED CONTENT
//
// Drop image files into src/photos/<slug>/ and they appear here automatically:
//   • a file named cover.* becomes the gallery cover (else the first image)
//   • the rest become the gallery, in filename order (so 01.jpg, 02.jpg, …)
//   • alt text is derived from the filename
//   • aspect ratios are read from the images at runtime — no need to measure
//
// Human metadata (title/intro/theme/order) lives in galleries.config.ts. Nothing
// in the app imports this file directly — everything goes through lib/content.ts,
// so this can later become a CMS adapter with no other changes.
// ─────────────────────────────────────────────────────────────────────────────

// Vite inlines this glob at build time into a map of { path: assetUrl }.
const files = import.meta.glob('../photos/*/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

function humanize(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

type Entry = { name: string; url: string }

// Group discovered image URLs by their folder (= gallery slug).
const bySlug = new Map<string, Entry[]>()
for (const path in files) {
  const m = path.match(/\/photos\/([^/]+)\/([^/]+)$/)
  if (!m) continue
  const [, slug, name] = m
  const list = bySlug.get(slug) ?? []
  list.push({ name, url: files[path] })
  bySlug.set(slug, list)
}

function buildGallery(
  slug: string,
  title: string,
  theme: GalleryTheme,
  intro?: string,
  sections?: Gallery['sections'],
): Gallery | null {
  const entries = (bySlug.get(slug) ?? []).sort((a, b) => a.name.localeCompare(b.name))
  if (entries.length === 0) return null

  const cover = entries.find((e) => /^cover\./i.test(e.name)) ?? entries[0]
  const rest = entries.filter((e) => e !== cover)
  const source = rest.length > 0 ? rest : entries // single-image galleries still show

  const photos: Photo[] = source.map((e) => ({
    src: { src: e.url },
    alt: humanize(e.name),
    reveal: 'pixelate',
  }))

  return { slug, title, intro, sections, cover: { src: cover.url }, theme, photos }
}

// Configured galleries first (in config order)…
const configured = galleryMeta
  .map((m) => buildGallery(m.slug, m.title, m.theme, m.intro, m.sections))
  .filter((g): g is Gallery => g !== null)

// …then any folders that have images but no config entry (default theme).
const configuredSlugs = new Set(galleryMeta.map((m) => m.slug))
const extras = [...bySlug.keys()]
  .filter((slug) => !configuredSlugs.has(slug))
  .sort()
  .map((slug) => buildGallery(slug, humanize(slug), DEFAULT_THEME))
  .filter((g): g is Gallery => g !== null)

export const galleries: Gallery[] = [...configured, ...extras]
