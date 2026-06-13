import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getGallery } from '../lib/content'
import { useAppStore } from '../store/useAppStore'
import { domGallery } from '../lib/domGallery'
import { galleryScroll } from '../lib/galleryScroll'
import { livePalette } from '../lib/palette'
import GalleryPhoto from './GalleryPhoto'
import HeaderText from './HeaderText'
import TripMap from './TripMap'

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
            <GalleryPhoto url={c.src!} width={c.w} height={c.h} />
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
