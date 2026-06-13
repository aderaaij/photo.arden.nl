import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getGallery } from '../lib/content'
import { useAppStore } from '../store/useAppStore'
import { domGallery } from '../lib/domGallery'
import { galleryScroll } from '../lib/galleryScroll'
import { livePalette } from '../lib/palette'
import { drainUploads } from '../lib/textureQueue'
import GalleryPhoto from './GalleryPhoto'
import HeaderText from './HeaderText'
import TripMap from './TripMap'

// How near a chapter's route map must scroll before that chapter's photos start
// loading. Half a viewport of lead on top of the map's own ~2.5-viewport height.
const CHAPTER_PRELOAD_MARGIN = '50% 0px'

// Photos mounted per frame once their chapter is armed — keeps a chapter's
// meshes from reconciling in one commit. One per frame keeps each commit small
// (a single texture resolution); the map intro gives ~2.5 viewports of runway,
// so even this slow ramp finishes well before the photos are on-screen.
const MOUNT_STEP = 1

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
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const factor = viewport.height / size.height // world units per CSS pixel

  // Per-section palettes (THREE.Color instances, ready to lerp) + the
  // gallery's base palette the page starts from.
  const basePalette = useMemo(
    () =>
      gallery && {
        bg: new THREE.Color(gallery.theme.bg),
        fg: new THREE.Color(gallery.theme.fg),
        accent: new THREE.Color(gallery.theme.accent ?? gallery.theme.fg),
      },
    [gallery],
  )
  const sectionPalettes = useMemo(
    () =>
      gallery?.sections?.map((s) =>
        s.theme
          ? {
              bg: new THREE.Color(s.theme.bg),
              fg: new THREE.Color(s.theme.fg),
              accent: new THREE.Color(s.theme.accent ?? s.theme.fg),
            }
          : null,
      ) ?? [],
    [gallery],
  )
  const hasSectionPalettes = sectionPalettes.some(Boolean)
  const lastCss = useRef({ bg: '', fg: '', accent: '' })

  // Snapshot cells + their sizes when the page (re)registers. Sizes only
  // change on resize (which re-registers); positions are tracked per frame.
  // `photoOrder` is each photo's rank among photo cells (scroll order) — the
  // staggered-mount ramp counts in this space.
  const cells = useMemo(() => {
    let po = 0
    return domGallery.cells.map((c) => {
      const r = c.el.getBoundingClientRect()
      return {
        ...c,
        w: r.width * factor,
        h: r.height * factor,
        photoOrder: c.kind === 'photo' ? po++ : -1,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellsVersion, factor])

  // Cumulative photo count through each section: `photosThroughSection[s]` is how
  // many photos live in sections 0..s — i.e. how many are cleared to mount once
  // chapter `s` is armed.
  const photosThroughSection = useMemo(() => {
    const cum: number[] = []
    let acc = 0
    for (const c of cells) if (c.kind === 'photo') acc = (cum[c.section ?? 0] = acc + 1)
    for (let s = 1; s < cum.length; s++) cum[s] = cum[s] ?? cum[s - 1]
    return cum
  }, [cells])

  const groups = useRef<(THREE.Group | null)[]>([])
  const lastScrollY = useRef(window.scrollY)

  // Per-chapter lazy loading. A trip gallery opens each chapter with a sticky
  // ~2.5-viewport route map; we watch those map cells and, as each scrolls near,
  // clear that chapter's photos to load — so a whole chapter decodes and uploads
  // during its map intro and is on the GPU before any photo appears (smoother
  // than loading each frame as it enters view). Chapter 0's map sits at the top,
  // so it arms on mount; `armedThrough` is the deepest chapter cleared so far.
  // Flat galleries have no maps and fall back to per-photo observation.
  const chaptered = useMemo(() => cells.some((c) => c.kind === 'map'), [cells])
  const [armedThrough, setArmedThrough] = useState(-1)
  useEffect(() => {
    if (!chaptered) return
    const legByEl = new Map<Element, number>()
    for (const c of cells) if (c.kind === 'map' && c.el) legByEl.set(c.el, c.leg ?? 0)
    if (!legByEl.size) return
    const io = new IntersectionObserver(
      (entries) => {
        let max = -1
        for (const e of entries) {
          if (e.isIntersecting) max = Math.max(max, legByEl.get(e.target) ?? -1)
        }
        if (max >= 0) setArmedThrough((prev) => Math.max(prev, max))
      },
      { rootMargin: CHAPTER_PRELOAD_MARGIN },
    )
    for (const el of legByEl.keys()) io.observe(el)
    return () => io.disconnect()
  }, [cells, chaptered])

  // Staggered mount. Arming a chapter clears all its photos to load at once, so
  // their textures resolve in the same React tick and commit as one ~half-second
  // synchronous reconciliation (a visible scroll hitch per chapter). Instead we
  // ramp a cursor a couple of photos per frame toward the armed count, so the
  // mounts — and the Suspense resolutions they trigger — spread across frames.
  // Reset only on gallery change (not resize, which would unmount everything).
  const [mountCount, setMountCount] = useState(0)
  useEffect(() => {
    setMountCount(0)
    setArmedThrough(-1)
  }, [slug])

  useFrame(() => {
    // Pre-warm a couple of pending photo textures onto the GPU each frame, so
    // their upload is paid here (off the scroll path) rather than hitching the
    // frame the plane is first drawn.
    drainUploads(gl)

    // Advance the staggered-mount cursor toward the count of armed photos — but
    // hold it while parked at the very top, so the opening map's assembly intro
    // plays without chapter 0's photos mounting and uploading behind it. The
    // first scroll releases it (mounts are masked by motion then), and there's a
    // full map of runway before the photos. Deeper chapters arm mid-scroll, so
    // they're already past this gate.
    const parkedAtIntro = window.scrollY < 4
    const eligible =
      !parkedAtIntro && armedThrough >= 0 ? photosThroughSection[armedThrough] ?? 0 : 0
    if (mountCount < eligible) setMountCount(Math.min(eligible, mountCount + MOUNT_STEP))

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

    // Scroll-driven section palette: same position-driven idea as the header
    // reveal, but across a viewport-wide band — each chapter's colors flood
    // the page as its header approaches the anchor. Sequential lerp: once a
    // header is fully in, its palette IS the base the next one blends from.
    if (basePalette) {
      livePalette.bg.copy(basePalette.bg)
      livePalette.fg.copy(basePalette.fg)
      livePalette.accent.copy(basePalette.accent)
      if (hasSectionPalettes) {
        for (const c of cells) {
          if (c.kind !== 'header' || c.section == null) continue
          const pal = sectionPalettes[c.section]
          if (!pal) continue
          const end = size.height * 0.22 // header near its reveal anchor
          const start = end + size.height * 1.15 // band: ~a viewport of scroll
          let t = (start - c.el.getBoundingClientRect().top) / (start - end)
          t = THREE.MathUtils.clamp(t, 0, 1)
          t = t * t * (3 - 2 * t)
          if (t === 0) continue
          livePalette.bg.lerp(pal.bg, t)
          livePalette.fg.lerp(pal.fg, t)
          livePalette.accent.lerp(pal.accent, t)
        }
        // Push to the canvas clear color…
        if (scene.background instanceof THREE.Color) scene.background.copy(livePalette.bg)
        else scene.background = livePalette.bg.clone()
        // …and to the DOM's CSS variables (only when they actually change).
        const css = lastCss.current
        const root = document.documentElement
        const bg = `#${livePalette.bg.getHexString()}`
        const fgHex = `#${livePalette.fg.getHexString()}`
        const accent = `#${livePalette.accent.getHexString()}`
        if (bg !== css.bg) root.style.setProperty('--bg', (css.bg = bg))
        if (fgHex !== css.fg) root.style.setProperty('--fg', (css.fg = fgHex))
        if (accent !== css.accent) root.style.setProperty('--accent', (css.accent = accent))
      }
    }
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
            <GalleryPhoto
              url={c.src!}
              width={c.w}
              height={c.h}
              el={c.el}
              load={chaptered ? c.photoOrder < mountCount : undefined}
            />
          ) : c.kind === 'map' && gallery.trip ? (
            <TripMap
              trip={gallery.trip}
              theme={gallery.theme}
              width={c.w}
              height={c.h}
              el={c.el}
              leg={c.leg ?? 0}
            />
          ) : (
            <HeaderText
              text={c.text ?? ''}
              width={c.w}
              height={c.h}
              color={
                (c.section != null && gallery.sections?.[c.section]?.theme?.fg) || fg
              }
            />
          )}
        </group>
      ))}
    </>
  )
}
