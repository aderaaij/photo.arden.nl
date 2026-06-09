import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getGallery } from '../lib/content'
import { useAppStore } from '../store/useAppStore'
import { layoutGallery } from '../lib/galleryLayout'
import { galleryScroll } from '../lib/galleryScroll'
import GalleryPhoto from './GalleryPhoto'
import HeaderText from './HeaderText'

// A gallery: photos + section headers in an asymmetric, staggered editorial
// cascade. Page scroll (Lenis → store, 0..1) moves the whole group up through
// the content; the layout engine decides each frame's size and position.
export default function GalleryScene({ slug }: { slug: string }) {
  const gallery = useMemo(() => getGallery(slug), [slug])
  const group = useRef<THREE.Group>(null)
  const lastY = useRef(0)
  const viewport = useThree((s) => s.viewport)

  const layout = useMemo(
    () => (gallery ? layoutGallery(gallery, viewport.width, viewport.height) : null),
    [gallery, viewport.width, viewport.height],
  )

  useFrame((_, delta) => {
    if (!group.current || !layout) return
    const progress = useAppStore.getState().scroll
    const targetY = progress * layout.scrollRange
    const y = THREE.MathUtils.damp(group.current.position.y, targetY, 4, delta)
    group.current.position.y = y

    // Publish scroll velocity (world units / frame) for the header stroke effect.
    galleryScroll.velocity = y - lastY.current
    galleryScroll.smoothVelocity +=
      (galleryScroll.velocity - galleryScroll.smoothVelocity) * 0.2
    lastY.current = y
  })

  if (!gallery || !layout) return null

  const fg = gallery.theme.fg

  return (
    <group ref={group}>
      {layout.items.map((it) =>
        it.type === 'header' ? (
          <group key={it.index} position={[it.x, it.y, 0]}>
            <HeaderText text={it.text ?? ''} width={it.width} height={it.height} color={fg} />
          </group>
        ) : (
          <group key={it.index} position={[it.x, it.y, 0]}>
            <GalleryPhoto url={it.photo!.src.src} width={it.width} height={it.height} />
          </group>
        ),
      )}
    </group>
  )
}
