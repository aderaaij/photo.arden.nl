import { useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

// Cap the GPU-side texture size. The source photos are full-resolution camera
// exports (4–8MP); uploading those raw costs ~50MB of VRAM each with mipmaps
// and makes scrolling stutter. Downscaled once on arrival, a whole gallery
// stays comfortably under a couple hundred MB.
const MAX_TEX = 2048

// A single gallery frame: a fixed-size plane (sized by its DOM grid cell) with
// the photo center-cropped (object-fit: cover) to fill it.
export default function GalleryPhoto({
  url,
  width,
  height,
}: {
  url: string
  width: number
  height: number
}) {
  const source = useTexture(url)
  const img = source.image as HTMLImageElement | undefined
  const imgAspect =
    img?.naturalWidth && img?.naturalHeight
      ? img.naturalWidth / img.naturalHeight
      : width / height

  // Downscale oversized photos into a canvas-backed texture; small ones pass
  // through untouched.
  const texture = useMemo(() => {
    if (!img || Math.max(img.naturalWidth, img.naturalHeight) <= MAX_TEX) return source
    const scale = MAX_TEX / Math.max(img.naturalWidth, img.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return new THREE.CanvasTexture(canvas)
  }, [source, img])

  // Dispose derived textures when they're swapped out.
  useEffect(() => {
    if (texture === source) return
    return () => texture.dispose()
  }, [texture, source])

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
