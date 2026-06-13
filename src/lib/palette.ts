import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────────────
// LIVE PALETTE
//
// The frame-driven palette shared between the canvas and the DOM. As you
// scroll a gallery with per-section themes, GalleryScene blends each
// section's colors into these (position-driven, like the header reveal but
// across a viewport-wide band) and pushes them to the WebGL clear color and
// the CSS variables. Anything that draws in theme colors per frame (TripMap's
// ink dots, route, labels) copies from here so it stays legible while the
// background crossfades between chapters.
//
// Mutate the Color instances in place — never reassign them.
// ─────────────────────────────────────────────────────────────────────────────
export const livePalette = {
  bg: new THREE.Color('#0d0d0f'),
  fg: new THREE.Color('#f2efe9'),
  accent: new THREE.Color('#c9a86a'),
}
