import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getGallery } from '../lib/content'
import { useAppStore } from '../store/useAppStore'
import { domGallery } from '../lib/domGallery'
import { galleryScroll } from '../lib/galleryScroll'
import GalleryPhoto from './GalleryPhoto'
import HeaderText from './HeaderText'

// DOM-driven gallery: GalleryPage lays out invisible CSS-grid cells and
// registers them in domGallery; this scene mounts a plane per cell and snaps
// it to the cell's rect every frame. CSS owns layout and native (Lenis-
// smoothed) scroll owns motion — no second easing layer here, so the planes
// track the page 1:1 without rubber-banding.
export default function GalleryScene({ slug }: { slug: string }) {
  const gallery = useMemo(() => getGallery(slug), [slug])
  const cellsVersion = useAppStore((s) => s.cellsVersion)
  const size = useThree((s) => s.size)
  const viewport = useThree((s) => s.viewport)
  const factor = viewport.height / size.height // world units per CSS pixel

  // Snapshot cells + their sizes when the page (re)registers. Sizes only
  // change on resize (which re-registers); positions are tracked per frame.
  const cells = useMemo(
    () =>
      domGallery.cells.map((c) => {
        const r = c.el.getBoundingClientRect()
        return { ...c, w: r.width * factor, h: r.height * factor }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cellsVersion, factor],
  )

  const groups = useRef<(THREE.Group | null)[]>([])
  const lastScrollY = useRef(window.scrollY)

  useFrame(() => {
    for (let i = 0; i < cells.length; i++) {
      const g = groups.current[i]
      if (!g) continue
      const r = cells[i].el.getBoundingClientRect()
      g.position.set(
        (r.left + r.width / 2 - size.width / 2) * factor,
        -(r.top + r.height / 2 - size.height / 2) * factor,
        0,
      )
    }

    // Publish scroll velocity (world units / frame) for the header stroke effect.
    const sy = window.scrollY
    galleryScroll.velocity = (sy - lastScrollY.current) * factor
    galleryScroll.smoothVelocity +=
      (galleryScroll.velocity - galleryScroll.smoothVelocity) * 0.2
    lastScrollY.current = sy
  })

  if (!gallery) return null

  const fg = gallery.theme.fg

  return (
    <>
      {cells.map((c, i) => (
        <group
          key={`${cellsVersion}:${i}`}
          ref={(g) => {
            groups.current[i] = g
          }}
        >
          {c.kind === 'photo' ? (
            <GalleryPhoto url={c.src!} width={c.w} height={c.h} />
          ) : (
            <HeaderText text={c.text ?? ''} width={c.w} height={c.h} color={fg} />
          )}
        </group>
      ))}
    </>
  )
}
