// Live-tunable parameters for the section-header slice/smear reveal, mutated by
// the dev GalleryTuningPanel and read each frame by HeaderText. A plain singleton
// so the render loop reads it without re-renders.
export const headerTuning = {
  travel: 0.45, // max slice offset while scattered (box-height fraction, both axes)
  smear: 0.3, // grainy directional blur length along each slice's slide
  grain: 0.5, // grain dropout inside the smear while scattered
  rows: 6, // slice chunkiness (block rows)
  wobble: 0, // slice-cut waviness: 0 = straight cuts, 1 = hand-torn
  stagger: 0.5, // how staggered the slices merge into place
  fadeIn: 0.45, // portion of the reveal spent fading up from nothing
  reveal: 0.5, // reveal distance as a fraction of viewport height
  anchor: 0.08, // where the header merges into place (fraction above center)
}
