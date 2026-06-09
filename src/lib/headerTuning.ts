// Live-tunable parameters for the section-header column/grain reveal, mutated by
// the dev GalleryTuningPanel and read each frame by HeaderText. A plain singleton
// so the render loop reads it without re-renders.
export const headerTuning = {
  travel: 0.2, // max vertical column slide while displaced (box-height fraction)
  smear: 0.4, // grainy vertical blur length along each column's slide
  grain: 0.5, // grain dropout inside the smear while displaced
  columns: 26, // column count across the text width
  stagger: 0.5, // how staggered the columns glide into place
  fadeIn: 0.45, // portion of the reveal spent fading up from nothing
  reveal: 0.5, // reveal distance as a fraction of viewport height
  anchor: 0.08, // where the header merges into place (fraction above center)
}
