// Live-tunable parameters for the section-header slice/grain reveal, mutated by
// the dev GalleryTuningPanel and read each frame by HeaderText. A plain singleton
// so the render loop reads it without re-renders.
export const headerTuning = {
  travel: 0.5, // max vertical slice offset (fraction of box height)
  grain: 0, // master grain amount: 0 = clean slices; >0 fades in the pixel grain (parked)
  fine: 220, // grain grid resolution (cells across the header)
  dot: 0.32, // particle fill within its cell (smaller = more gap = finer dust)
  rows: 6, // slice chunkiness (block rows)
  stagger: 0.5, // how staggered the slices click into place
  reveal: 0.5, // reveal distance as a fraction of viewport height
  anchor: 0.08, // where the header clicks into place (fraction above center)
}
