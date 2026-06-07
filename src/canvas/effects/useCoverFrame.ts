import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { infiniteScroll } from '../../lib/scrollController'
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

  useFrame(() => {
    const g = groupRef.current
    if (!g) return

    const raw = index * spacing - infiniteScroll.current
    const wrapped =
      ((raw + totalWidth / 2) % totalWidth + totalWidth) % totalWidth - totalWidth / 2
    g.position.x = wrapped

    const focus = THREE.MathUtils.clamp(1 - Math.abs(wrapped) / spacing, 0, 1)
    g.scale.setScalar(THREE.MathUtils.lerp(0.82, 1.0, focus))

    onFrame({
      wrapped,
      focus,
      shift: THREE.MathUtils.clamp(wrapped / spacing, -1, 1),
      velocity: THREE.MathUtils.clamp(infiniteScroll.velocity, -0.4, 0.4),
    })
  })
}
