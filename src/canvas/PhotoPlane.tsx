import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import vertexShader from '../shaders/reveal.vert'
import fragmentShader from '../shaders/reveal.frag'

interface Props {
  url: string
  /** plane width in world units */
  scale?: number
  /** animate the reveal once on mount (used for index covers) */
  autoReveal?: boolean
  /** tie the reveal to how close the plane is to screen center (used in galleries) */
  revealByDistance?: boolean
  index?: number
  onClick?: () => void
}

export default function PhotoPlane({
  url,
  scale = 2.6,
  autoReveal,
  revealByDistance,
  index = 0,
  onClick,
}: Props) {
  const mesh = useRef<THREE.Mesh>(null)
  const texture = useTexture(url)

  // useTexture suspends until loaded, so the image dimensions are ready here.
  const image = texture.image as HTMLImageElement | undefined
  const aspect =
    image?.naturalWidth && image?.naturalHeight
      ? image.naturalWidth / image.naturalHeight
      : 0.8

  // Pass-through color (see SceneCanvas color note): treat the texture as raw
  // bytes so the pixelation/alpha math doesn't shift the photo's colors.
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
      uProgress: { value: 0 },
    }),
    [texture],
  )

  // Index covers: reveal once, staggered by index.
  useEffect(() => {
    if (!autoReveal) return
    const tween = gsap.to(uniforms.uProgress, {
      value: 1,
      duration: 1.4,
      ease: 'power2.out',
      delay: 0.15 * index,
    })
    return () => {
      tween.kill()
    }
  }, [autoReveal, uniforms, index])

  // Gallery photos: reveal based on distance from screen center (scroll-linked).
  const worldPos = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, delta) => {
    if (!revealByDistance || !mesh.current) return
    mesh.current.getWorldPosition(worldPos)
    const target = THREE.MathUtils.clamp(1 - Math.abs(worldPos.y) / 2.6, 0, 1)
    uniforms.uProgress.value = THREE.MathUtils.damp(
      uniforms.uProgress.value,
      target,
      6,
      delta,
    )
  })

  const width = scale
  const height = scale / aspect

  return (
    <mesh
      ref={mesh}
      onClick={onClick}
      onPointerOver={() => {
        if (onClick) document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        if (onClick) document.body.style.cursor = ''
      }}
    >
      <planeGeometry args={[width, height, 1, 1]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  )
}
