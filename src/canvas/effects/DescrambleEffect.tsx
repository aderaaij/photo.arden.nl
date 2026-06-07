import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import vertexShader from '../../shaders/cover.vert'
import fragmentShader from '../../shaders/descramble.frag'
import { useCoverTexture } from './useCoverTexture'
import { useCoverFrame } from './useCoverFrame'
import { COVER_ASPECT, DEFAULT_BASE_WIDTH } from './constants'
import { tuning } from '../../lib/tuning'
import type { CoverEffectProps } from './types'

// Blocks scatter and quantize-snap into place as the cover centers.
export default function DescrambleEffect({
  url,
  index,
  count,
  spacing,
  baseWidth = DEFAULT_BASE_WIDTH,
  onClick,
}: CoverEffectProps) {
  const group = useRef<THREE.Group>(null)
  const { texture, imageAspect } = useCoverTexture(url)

  const width = baseWidth
  const height = baseWidth / COVER_ASPECT

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uVelocity: { value: 0 },
      uFocus: { value: 0 },
      uShift: { value: 0 },
      uPlaneAspect: { value: COVER_ASPECT },
      uImageAspect: { value: imageAspect },
      uBillow: { value: tuning.billow },
      uBow: { value: tuning.bow },
      uBlocks: { value: tuning.blocks },
      uSteps: { value: tuning.steps },
      uDisplace: { value: tuning.snapDisplace },
      uAberration: { value: tuning.aberration },
      uDim: { value: tuning.dim },
    }),
    [texture, imageAspect],
  )

  useCoverFrame(group, index, count, spacing, (s) => {
    uniforms.uFocus.value = s.focus
    uniforms.uShift.value = s.shift
    uniforms.uVelocity.value = s.velocity
    uniforms.uBillow.value = tuning.billow
    uniforms.uBow.value = tuning.bow
    uniforms.uBlocks.value = tuning.blocks
    uniforms.uSteps.value = tuning.steps
    uniforms.uDisplace.value = tuning.snapDisplace
    uniforms.uAberration.value = tuning.aberration
    uniforms.uDim.value = tuning.dim
  })

  return (
    <group ref={group}>
      <mesh
        onClick={onClick}
        onPointerOver={() => {
          document.body.style.cursor = 'grab'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
      >
        <planeGeometry args={[width, height, 32, 32]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
        />
      </mesh>
    </group>
  )
}
