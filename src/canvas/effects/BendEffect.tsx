import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import vertexShader from '../../shaders/cover.vert'
import fragmentShader from '../../shaders/bend.frag'
import { useCoverTexture } from './useCoverTexture'
import { useCoverFrame } from './useCoverFrame'
import { COVER_ASPECT, DEFAULT_BASE_WIDTH } from './constants'
import { tuning } from '../../lib/tuning'
import { hover } from '../../lib/pointer'
import type { CoverEffectProps } from './types'

// Velocity bend + chromatic aberration on a single 2:3 plane — the original look.
export default function BendEffect({
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
      uPlaneAspect: { value: COVER_ASPECT },
      uImageAspect: { value: imageAspect },
      uBillow: { value: tuning.billow },
      uBow: { value: tuning.bow },
      uAberration: { value: tuning.aberration },
      uDim: { value: tuning.dim },
      uParallax: { value: new THREE.Vector2() },
      uParallaxInset: { value: 0 },
      uHover: { value: 0 },
      uShadow: { value: tuning.shadow },
      uShadowWidth: { value: tuning.shadowWidth },
    }),
    [texture, imageAspect],
  )

  useCoverFrame(group, index, count, spacing, (s) => {
    uniforms.uFocus.value = s.focus
    uniforms.uVelocity.value = s.velocity
    uniforms.uBillow.value = tuning.billow
    uniforms.uBow.value = tuning.bow
    uniforms.uAberration.value = tuning.aberration
    uniforms.uDim.value = tuning.dim
    uniforms.uParallax.value.set(s.parallaxX, s.parallaxY)
    uniforms.uParallaxInset.value = s.parallaxInset
    uniforms.uHover.value = s.hoverAmount
    uniforms.uShadow.value = tuning.shadow
    uniforms.uShadowWidth.value = tuning.shadowWidth
  })

  return (
    <group ref={group}>
      <mesh
        onClick={onClick}
        onPointerOver={(e) => {
          document.body.style.cursor = 'grab'
          hover.index = index
          if (e.uv) {
            hover.u = e.uv.x
            hover.v = e.uv.y
          }
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
          if (hover.index === index) {
            hover.index = -1
            hover.u = 0.5 // recenter so the next hover never starts from a stale edge
            hover.v = 0.5
          }
        }}
        onPointerMove={(e) => {
          if (e.uv) {
            hover.u = e.uv.x
            hover.v = e.uv.y
          }
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
