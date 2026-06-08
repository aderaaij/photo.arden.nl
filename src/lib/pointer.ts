// Hover state for the in-frame parallax. Each cover's pointer handlers write
// which cover is hovered (index, -1 = none) and where on it the cursor sits
// (u, v in 0..1 mesh UV, 0.5/0.5 = center). useCoverFrame reads this to pan the
// photo inside the focused, settled frame. A plain singleton so reads in the
// render loop don't trigger React re-renders.
export const hover = { index: -1, u: 0.5, v: 0.5 }
