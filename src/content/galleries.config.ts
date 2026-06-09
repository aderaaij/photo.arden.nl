import type { GallerySection, GalleryTheme } from '../types'

export interface GalleryMeta {
  slug: string
  title: string
  intro?: string
  theme: GalleryTheme
  /** Optional section headers (label + the photo index they precede). */
  sections?: GallerySection[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Human-authored gallery metadata + carousel order.
//
// Photos themselves are auto-discovered from src/photos/<slug>/ (see
// galleries.ts) — you don't list files here. To add/curate a gallery:
//   1. add an entry below (slug must match the folder name)
//   2. drop images into src/photos/<slug>/
// A folder with images but no entry here still shows up, using a default theme.
// ─────────────────────────────────────────────────────────────────────────────
export const galleryMeta: GalleryMeta[] = [
  {
    slug: 'lisbon-nights',
    title: 'Lisbon Nights',
    intro: 'Tiled streets and sodium light after midnight.',
    theme: { bg: '#0c0b10', fg: '#f1ecff', accent: '#b79cff' },
    // Demo section headers, to feel the scroll-stroke effect between groups.
    sections: [
      { label: 'Lisbon Nights', before: 0 },
      { label: 'After Midnight', before: 3 },
    ],
  },
  {
    slug: 'coastal',
    title: 'Coastal',
    intro: 'Atlantic light, salt, and long horizons.',
    theme: { bg: '#e9e4da', fg: '#1b1a17', accent: '#3d6e7a' },
  },
  {
    slug: 'portraits',
    title: 'Portraits',
    intro: 'People, held still for a moment.',
    theme: { bg: '#15110e', fg: '#f6ead9', accent: '#d89a5b' },
  },
]

export const DEFAULT_THEME: GalleryTheme = {
  bg: '#0d0d0f',
  fg: '#f2efe9',
  accent: '#c9a86a',
}
