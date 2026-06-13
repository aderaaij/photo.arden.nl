import type { GallerySection, GalleryTheme, Trip } from '../types'

export interface GalleryMeta {
  slug: string
  title: string
  intro?: string
  theme: GalleryTheme
  /** Optional section headers (label + the photo index they precede). */
  sections?: GallerySection[]
  /** Trip galleries: route stops in travel order. Each stop's `id` names the
   *  chapter subfolder (src/photos/<slug>/NN-<id>/) and its `label` becomes
   *  that chapter's section header. */
  trip?: Trip
  /** Header label overrides for chapter subfolders that aren't trip stops,
   *  keyed by folder name sans numeric prefix. */
  chapters?: Record<string, string>
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
    slug: 'japan',
    title: 'Japan',
    intro: 'Tokyo north to Hokkaido, then south to Kyushu.',
    // Sumi ink on paper, vermillion route.
    theme: { bg: '#f2ede2', fg: '#211d1a', accent: '#c83c2e' },
    // Each stop carries its chapter's palette; the page crossfades to it as
    // the chapter header scrolls in. Stops run in travel order: Tokyo, up to
    // Hokkaido (Sapporo, Otaru), down to Kyushu (Fukuoka, Nagasaki), then back
    // north-east to Hiroshima. The palettes alternate dark/light end to end, so
    // every chapter boundary reads as a scene change: Tokyo night → Sapporo
    // snow → Otaru gaslight → Fukuoka yatai → Nagasaki harbour night →
    // Hiroshima daylight.
    trip: {
      stops: [
        {
          // No `theme` → the background derives from this chapter's own photos
          // (npm run palettes). The Sensō-ji night set reads as teal shadow +
          // warm lantern light. Add a `theme: {…}` here to override the auto
          // palette, exactly like the chapters below.
          id: 'tokyo', label: '東京', name: 'Tokyo', lon: 139.69, lat: 35.69,
        },
        {
          // No `theme` → derived from this chapter's photos (npm run palettes).
          // The winter-night street set reads as dark green-teal + warm
          // signage light. Add a `theme: {…}` here to override.
          id: 'sapporo', label: '札幌', name: 'Sapporo', lon: 141.35, lat: 43.06,
        },
        {
          id: 'otaru', label: '小樽', name: 'Otaru', lon: 141.0, lat: 43.19, labelDir: 'left',
          theme: { bg: '#252b36', fg: '#efe6d2', accent: '#d9a05b' },
        },
        {
          // No `theme` → derived from this chapter's photos (npm run palettes).
          // Yatai lanterns blaze warm against the dark alleys, so the vivid-
          // character rule gives a deep rust/copper backdrop. Override here if
          // you'd rather pin a colour.
          id: 'fukuoka', label: '福岡', name: 'Fukuoka', lon: 130.4, lat: 33.59, labelDir: 'left',
        },
        {
          // No `theme` → derived from this chapter's photos (npm run palettes).
          id: 'nagasaki', label: '長崎', name: 'Nagasaki', lon: 129.88, lat: 32.75, labelDir: 'left',
        },
        {
          id: 'hiroshima', label: '広島', name: 'Hiroshima', lon: 132.46, lat: 34.39,
          // Inland Sea daylight: hazy green-white, pine ink, sea-pine accent.
          theme: { bg: '#e7ece3', fg: '#1e2722', accent: '#3c7a64' },
        },
      ],
    },
  },
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
