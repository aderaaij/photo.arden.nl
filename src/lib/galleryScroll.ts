// Per-frame scroll velocity of the gallery (world units / frame), written by
// GalleryScene and read by the section headers to drive their scroll-stroke
// effect. A plain singleton so the render loop reads it without re-renders.
export const galleryScroll = {
  velocity: 0,
  smoothVelocity: 0,
}
