import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getGallery } from '../lib/content'
import { useAppStore } from '../store/useAppStore'
import PhotoPlane from './PhotoPlane'

// A gallery: photos stacked vertically. Page scroll (via Lenis -> store) moves
// the whole group; each photo reveals as it nears screen center.
export default function GalleryScene({ slug }: { slug: string }) {
  const gallery = useMemo(() => getGallery(slug), [slug])
  const group = useRef<THREE.Group>(null)

  const spacing = 4.2
  const count = gallery?.photos.length ?? 0
  const totalHeight = Math.max(0, (count - 1) * spacing)

  useFrame((_, delta) => {
    if (!group.current) return
    const progress = useAppStore.getState().scroll
    const targetY = progress * totalHeight
    group.current.position.y = THREE.MathUtils.damp(
      group.current.position.y,
      targetY,
      4,
      delta,
    )
  })

  if (!gallery) return null

  return (
    <group ref={group}>
      {gallery.photos.map((p, i) => (
        <group key={i} position={[0, -i * spacing, 0]}>
          <PhotoPlane
            url={p.src.src}
            scale={3}
            revealByDistance
            index={i}
          />
        </group>
      ))}
    </group>
  )
}
