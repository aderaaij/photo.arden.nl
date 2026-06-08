import { useEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import coverVert from '../../shaders/cover.vert'
import coverFrag from '../../shaders/cover.frag'
import pointsVert from '../../shaders/points.vert'
import pointsFrag from '../../shaders/points.frag'
import { useCoverTexture } from './useCoverTexture'
import { useCoverFrame } from './useCoverFrame'
import { COVER_ASPECT, DEFAULT_BASE_WIDTH } from './constants'
import { tuning } from '../../lib/tuning'
import type { CoverEffectProps } from './types'

// Particle grid resolution (ROWS = COLS / COVER_ASPECT keeps points square).
const COLS = 120
const ROWS = 180
const OVERLAP = 1.6 // point size vs spacing — >1 so particles tile with no gaps

// Hybrid: particles fly in and assemble, then crossfade into a crisp plane.
export default function ParticlesEffect({
  url,
  index,
  count,
  spacing,
  baseWidth = DEFAULT_BASE_WIDTH,
  onClick,
}: CoverEffectProps) {
  const group = useRef<THREE.Group>(null)
  const { texture, imageAspect } = useCoverTexture(url)
  const size = useThree((s) => s.size)
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)

  const width = baseWidth
  const height = baseWidth / COVER_ASPECT

  // One uniforms object shared by both the particle material and the plane.
  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uVelocity: { value: 0 },
      uFocus: { value: 0 },
      uShift: { value: 0 },
      uPlaneAspect: { value: COVER_ASPECT },
      uImageAspect: { value: imageAspect },
      uPointSize: { value: (width / COLS) * OVERLAP },
      uScale: { value: 1 },
      // Bend/drift is exclusive to the Bend & Drift effect — no velocity arc here.
      uBillow: { value: 0 },
      uBow: { value: 0 },
      uFlyDist: { value: tuning.flyDist },
      uFlyVel: { value: tuning.flyVel },
      uAberration: { value: tuning.aberration },
    }),
    [texture, imageAspect, width],
  )

  // Particle grid over the 2:3 plane: each point carries its pixel UV + randoms.
  const pointGeo = useMemo(() => {
    const n = COLS * ROWS
    const positions = new Float32Array(n * 3)
    const uvs = new Float32Array(n * 2)
    const randoms = new Float32Array(n * 3)
    let i = 0
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const u = (x + 0.5) / COLS
        const v = (y + 0.5) / ROWS
        positions[i * 3] = (u - 0.5) * width
        positions[i * 3 + 1] = (v - 0.5) * height
        positions[i * 3 + 2] = 0
        uvs[i * 2] = u
        uvs[i * 2 + 1] = v
        randoms[i * 3] = Math.random()
        randoms[i * 3 + 1] = Math.random()
        randoms[i * 3 + 2] = Math.random()
        i++
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('aUv', new THREE.BufferAttribute(uvs, 2))
    g.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 3))
    return g
  }, [width, height])

  useEffect(() => () => pointGeo.dispose(), [pointGeo])

  useCoverFrame(group, index, count, spacing, (s) => {
    uniforms.uFocus.value = s.focus
    uniforms.uShift.value = s.shift
    uniforms.uVelocity.value = s.velocity
    uniforms.uFlyDist.value = tuning.flyDist
    uniforms.uFlyVel.value = tuning.flyVel
    uniforms.uAberration.value = tuning.aberration

    // Perspective point-size scale: world units → framebuffer pixels.
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 45
    uniforms.uScale.value =
      (size.height * gl.getPixelRatio()) / (2 * Math.tan((fov * Math.PI) / 360))
  })

  return (
    <group ref={group}>
      <points geometry={pointGeo} frustumCulled={false}>
        <shaderMaterial
          vertexShader={pointsVert}
          fragmentShader={pointsFrag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
        />
      </points>

      <mesh
        renderOrder={1}
        frustumCulled={false}
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
          vertexShader={coverVert}
          fragmentShader={coverFrag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
