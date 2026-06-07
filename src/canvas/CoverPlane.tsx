import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import vertexShader from '../shaders/cover.vert'
import fragmentShader from '../shaders/cover.frag'
import { infiniteScroll } from '../lib/scrollController'

interface Props {
  url: string
  index: number
  count: number
  spacing: number
  baseWidth?: number
  onClick?: () => void
}

// One gallery cover in the infinite ring. Computes its own wrapped x-position,
// focus (centeredness), and per-frame shader uniforms from the scroll singleton.
export default function CoverPlane({
  url,
  index,
  count,
  spacing,
  baseWidth = 3.0,
  onClick,
}: Props) {
  const group = useRef<THREE.Group>(null)
  const texture = useTexture(url)

  // useTexture suspends until loaded, so the image dimensions are ready here.
  const image = texture.image as HTMLImageElement | undefined
  const aspect =
    image?.naturalWidth && image?.naturalHeight
      ? image.naturalWidth / image.naturalHeight
      : 0.8

  useEffect(() => {
    texture.colorSpace = THREE.NoColorSpace
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = true
    texture.anisotropy = 8
    texture.needsUpdate = true
  }, [texture])

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uVelocity: { value: 0 },
      uFocus: { value: 0 },
    }),
    [texture],
  )

  const totalWidth = count * spacing

  useFrame(() => {
    if (!group.current) return

    // Wrap into [-totalWidth/2, totalWidth/2) so the ring loops seamlessly.
    const raw = index * spacing - infiniteScroll.current
    const wrapped =
      ((raw + totalWidth / 2) % totalWidth + totalWidth) % totalWidth - totalWidth / 2
    group.current.position.x = wrapped

    const focus = THREE.MathUtils.clamp(1 - Math.abs(wrapped) / spacing, 0, 1)
    group.current.scale.setScalar(THREE.MathUtils.lerp(0.82, 1.0, focus))

    uniforms.uFocus.value = focus
    uniforms.uVelocity.value = THREE.MathUtils.clamp(infiniteScroll.velocity, -0.4, 0.4)
  })

  const width = baseWidth
  const height = baseWidth / aspect

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
