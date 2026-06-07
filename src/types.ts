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

export interface Photo {
  src: ImageRef
  alt: string
  /** Which WebGL reveal to use as this photo scrolls into view. */
  reveal?: RevealEffect
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

export interface Gallery {
  slug: string
  title: string
  intro?: string
  cover: ImageRef
  theme: GalleryTheme
  photos: Photo[]
}
