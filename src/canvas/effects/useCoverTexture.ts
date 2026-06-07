import { useEffect } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { COVER_ASPECT } from './constants'

// Loads a cover texture (suspends until ready), configures it for pass-through
// color, and derives the image's aspect ratio for the cover-crop.
export function useCoverTexture(url: string) {
  const texture = useTexture(url)

  const image = texture.image as HTMLImageElement | undefined
  const imageAspect =
    image?.naturalWidth && image?.naturalHeight
      ? image.naturalWidth / image.naturalHeight
      : COVER_ASPECT

  useEffect(() => {
    texture.colorSpace = THREE.NoColorSpace
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = true
    texture.anisotropy = 8
    texture.needsUpdate = true
  }, [texture])

  return { texture, imageAspect }
}
