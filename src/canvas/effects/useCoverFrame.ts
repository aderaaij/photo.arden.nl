import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { infiniteScroll } from '../../lib/scrollController'
import { hover } from '../../lib/pointer'
import { tuning } from '../../lib/tuning'
import type { CoverFrameState } from './types'

// Shared per-frame layout for any cover effect: wraps the cover into the
// infinite ring, positions + scales the group, and hands the effect its focus /
// shift / velocity so it only has to drive its own uniforms.
export function useCoverFrame(
  groupRef: { current: THREE.Group | null },
  index: number,
  count: number,
  spacing: number,
  onFrame: (state: CoverFrameState) => void,
) {
  const totalWidth = count * spacing
  // Eased in-frame parallax pan offset (x, y). The zoom inset is constant (a
  // baseline zoom-in), so the photo sits slightly zoomed at rest and hovering
  // only pans within that headroom — no scale change on hover.
  const par = useRef({ x: 0, y: 0 })
  const anchor = useRef({ u: 0.5, v: 0.5 }) // cursor UV at hover entry
  const wasActive = useRef(false)
  const ha = useRef(0) // smoothed hover amount (for the inner frame shadow)

  useFrame(() => {
    const g = groupRef.current
    if (!g) return

    const raw = index * spacing - infiniteScroll.current
    const wrapped =
      ((raw + totalWidth / 2) % totalWidth + totalWidth) % totalWidth - totalWidth / 2
    g.position.x = wrapped

    const focus = THREE.MathUtils.clamp(1 - Math.abs(wrapped) / spacing, 0, 1)
    g.scale.setScalar(THREE.MathUtils.lerp(0.82, 1.0, focus))

    // In-frame hover parallax: only the focused cover, only while the carousel is
    // settled, only while the pointer is over it. The photo slides inside the
    // fixed frame (opposite the cursor) and clips under the edge. `a` eases the
    // intensity in/out; the pan tracks the cursor's position over the image.
    const still =
      1 - THREE.MathUtils.clamp(Math.abs(infiniteScroll.smoothVelocity) / 0.04, 0, 1)
    const active = (hover.index === index ? 1 : 0) * focus * still
    // Anchor the parallax to where the cursor ENTERED, not the image centre, so
    // there's no jump on entry: the photo pans opposite to how far the cursor has
    // moved from its entry point, clamped to the zoom headroom.
    const s = tuning.parallax
    const isActive = active > 0.01
    if (isActive && !wasActive.current) {
      anchor.current.u = hover.u
      anchor.current.v = hover.v
    }
    wasActive.current = isActive
    const tx = THREE.MathUtils.clamp((hover.u - anchor.current.u) * 2 * s, -s, s) * active
    const ty = THREE.MathUtils.clamp((hover.v - anchor.current.v) * 2 * s, -s, s) * active
    // Responsive while tracking the cursor, gentler easing back to centre on exit.
    const e = isActive ? 0.15 : 0.06
    par.current.x += (tx - par.current.x) * e
    par.current.y += (ty - par.current.y) * e
    ha.current += (active - ha.current) * e

    onFrame({
      wrapped,
      focus,
      shift: THREE.MathUtils.clamp(wrapped / spacing, -1, 1),
      velocity: THREE.MathUtils.clamp(infiniteScroll.smoothVelocity, -0.5, 0.5),
      parallaxX: par.current.x,
      parallaxY: par.current.y,
      // constant baseline zoom = the pan range, so |pan| ≤ inset always holds and
      // there's no scale change on hover (the photo is just zoomed in a touch)
      parallaxInset: s,
      hoverAmount: ha.current,
    })
  })
}
