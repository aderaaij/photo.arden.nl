import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getGalleries } from '../lib/content'
import { useAppStore } from '../store/useAppStore'
import { infiniteScroll } from '../lib/scrollController'
import { getAverageColor } from '../lib/averageColor'
import { getEffect } from './effects'

const SPACING = 3.2
const BASE_WIDTH = 2.6

// Frontpage: an infinite horizontal carousel of gallery covers. Scroll/drag
// moves the ring (with velocity distortion in the cover shader); whichever cover
// is centered becomes the "focus" — its title shows in the DOM and the scene
// background eases toward its average color.
export default function IndexScene() {
  const galleries = useMemo(() => getGalleries(), [])
  const navigate = useAppStore((s) => s.navigate)
  const setFocusSlug = useAppStore((s) => s.setFocusSlug)
  const effectId = useAppStore((s) => s.effectId)
  const scene = useThree((s) => s.scene)

  const Effect = getEffect(effectId).Component

  const count = galleries.length
  const totalWidth = count * SPACING

  const focusIndex = useRef(0)
  const colors = useRef<(THREE.Color | null)[]>(galleries.map(() => null))
  const bg = useMemo(() => new THREE.Color('#0a0a0a'), [])
  const bgTarget = useMemo(() => new THREE.Color('#0a0a0a'), [])

  // Drive the carousel only while the homepage is mounted.
  useEffect(() => {
    infiniteScroll.snapStep = SPACING
    infiniteScroll.attach()
    return () => infiniteScroll.detach()
  }, [])

  // Own the scene background while on the homepage (SceneManager skips <color> here).
  useEffect(() => {
    scene.background = bg
  }, [scene, bg])

  // Precompute average cover colors (slightly darkened for a moodier bg).
  useEffect(() => {
    let alive = true
    galleries.forEach(async (g, i) => {
      const c = await getAverageColor(g.cover.src)
      if (alive) colors.current[i] = c.clone().multiplyScalar(0.6)
    })
    return () => {
      alive = false
    }
  }, [galleries])

  useFrame(() => {
    infiniteScroll.update()

    // Which cover is centered?
    let best = Infinity
    let bi = 0
    for (let i = 0; i < count; i++) {
      const raw = i * SPACING - infiniteScroll.current
      const wrapped =
        ((raw + totalWidth / 2) % totalWidth + totalWidth) % totalWidth - totalWidth / 2
      const d = Math.abs(wrapped)
      if (d < best) {
        best = d
        bi = i
      }
    }
    if (bi !== focusIndex.current) {
      focusIndex.current = bi
      setFocusSlug(galleries[bi].slug)
    }

    // Ease the background toward the focused cover's color.
    const tc = colors.current[bi]
    if (tc) bgTarget.copy(tc)
    bg.lerp(bgTarget, 0.05)
  })

  const handleClick = (i: number, slug: string) => {
    // Reject the tail end of a drag as an accidental click.
    if (infiniteScroll.dragDistance > 6) return
    if (i === focusIndex.current) {
      navigate(`/g/${slug}`)
    } else {
      infiniteScroll.scrollToIndex(i, totalWidth)
    }
  }

  return (
    <group>
      {galleries.map((g, i) => (
        <Effect
          // include effectId so switching cleanly remounts each cover
          key={`${effectId}-${g.slug}`}
          url={g.cover.src}
          index={i}
          count={count}
          spacing={SPACING}
          baseWidth={BASE_WIDTH}
          onClick={() => handleClick(i, g.slug)}
        />
      ))}
    </group>
  )
}
