import { galleries } from '../content/galleries'
import type { Gallery } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT DATA LAYER
//
// This is the ONLY module the rest of the app imports for content. Today it
// reads from a repo file; tomorrow swap the bodies to fetch from Keystatic /
// Sanity / an API and nothing else has to change. Keep these functions'
// signatures stable.
// ─────────────────────────────────────────────────────────────────────────────

export function getGalleries(): Gallery[] {
  return galleries
}

export function getGallery(slug: string): Gallery | undefined {
  return galleries.find((g) => g.slug === slug)
}
