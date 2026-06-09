// Live-tunable effect parameters, mutated by the leva panel (TuningPanel) and
// read each frame by the cover effects. A plain singleton (not React state) so
// reads in the render loop don't trigger re-renders. Defaults match the shader
// constants, so behaviour is unchanged until a slider moves.
export const tuning = {
  // Bend (shared by all effects)
  billow: 1.8, // sideways arc amount
  bow: 2.4, // depth of the bow

  // Image look (shared)
  aberration: 0.2, // chromatic aberration gain
  dim: 0.45, // how far off-center covers fade

  // Pixel Snap
  blocks: 18, // block grid resolution
  steps: 5, // quantization steps
  snapDisplace: 0.08, // how far blocks scatter

  // Particle Assemble
  flyDist: 0.6, // base distance particles fly from
  flyVel: 1.8, // extra fly distance from scroll speed

  // In-frame hover parallax (focused, settled cover only): the photo pans inside
  // the fixed frame, opposite the cursor, clipping under the edge.
  parallax: 0.025, // pan amount as a fraction of the image (also the zoom headroom)
  shadow: 0.1, // inner frame shadow strength on hover (0 = off)
  shadowWidth: 0.02, // how far the inner shadow reaches in from the edge
}
