// Domain model for galleries. This is the contract the rest of the app codes
// against — the content *source* (repo files now, a CMS later) is hidden behind
// the data layer in `src/lib/content.ts`.

export type RevealEffect = 'pixelate' | 'pointcloud' | 'displace'

export interface ImageRef {
  src: string
  /** Optional — aspect is derived from the loaded image at runtime if absent. */
  width?: number
  height?: number
}

/** Optional per-photo override for the auto layout (the cascade is otherwise
 *  generated). Any field left unset falls back to the generated rhythm. */
export interface PhotoLayout {
  /** Which side of the column the photo sits on. */
  column?: 'left' | 'right' | 'center' | 'full'
  /** Frame width as a fraction (0..1) of the usable content width. */
  width?: number
  /** Frame aspect (w/h). Image is center-cropped to fill it. */
  aspect?: number
}

export interface Photo {
  src: ImageRef
  alt: string
  /** Which WebGL reveal to use as this photo scrolls into view. */
  reveal?: RevealEffect
  /** Optional manual placement; otherwise the layout engine decides. */
  layout?: PhotoLayout
}

export interface GalleryTheme {
  /** Background color (also drives the WebGL clear color). */
  bg: string
  /** Foreground / text color. */
  fg: string
  accent?: string
  /** Optional display-font override per gallery. */
  font?: string
}

/** A big text header placed before a photo, dividing the gallery into sections
 *  (each rendered with the scroll-driven stroke effect). */
export interface GallerySection {
  label: string
  /** Index of the photo this header appears before (0 = top of the gallery). */
  before: number
}

export interface Gallery {
  slug: string
  title: string
  intro?: string
  /** Optional date line for the chapter-intro card (e.g. "April 2019"). */
  date?: string
  /** Section headers between photo groups. If absent, the title heads the top. */
  sections?: GallerySection[]
  cover: ImageRef
  theme: GalleryTheme
  photos: Photo[]
}
