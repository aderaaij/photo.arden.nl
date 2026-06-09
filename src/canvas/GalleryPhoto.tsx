import { useEffect } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

// A single gallery frame: a fixed-size plane (from the layout engine) with the
// photo center-cropped (object-fit: cover) to fill it. Phase 1 is a plain
// textured plane; the scroll-driven dissolve reveal lands in a later phase.
export default function GalleryPhoto({
  url,
  width,
  height,
}: {
  url: string
  width: number
  height: number
}) {
  const texture = useTexture(url)
  const img = texture.image as HTMLImageElement | undefined
  const imgAspect =
    img?.naturalWidth && img?.naturalHeight
      ? img.naturalWidth / img.naturalHeight
      : width / height

  // Pass-through color (ColorManagement is disabled app-wide) + cover-crop via
  // the texture's repeat/offset so the image fills the frame without distortion.
  useEffect(() => {
    texture.colorSpace = THREE.NoColorSpace
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = true
    texture.anisotropy = 8
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping

    const slotAspect = width / height
    if (imgAspect > slotAspect) {
      const r = slotAspect / imgAspect
      texture.repeat.set(r, 1)
      texture.offset.set((1 - r) / 2, 0)
    } else {
      const r = imgAspect / slotAspect
      texture.repeat.set(1, r)
      texture.offset.set(0, (1 - r) / 2)
    }
    texture.needsUpdate = true
  }, [texture, imgAspect, width, height])

  return (
    <mesh>
      <planeGeometry args={[width, height, 1, 1]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}
