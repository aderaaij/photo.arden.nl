import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Leva } from 'leva'
import { useProgress } from '@react-three/drei'
import { getGallery } from '../lib/content'
import { useAppStore } from '../store/useAppStore'
import { buildGalleryBlocks, domGallery } from '../lib/domGallery'
import GalleryTuningPanel from '../components/GalleryTuningPanel'

// Thin loading bar while textures stream in (useProgress taps three's
// DefaultLoadingManager, so it works out here in DOM-land). Frames now load
// lazily per cell, so this reads the first screenful on entry and flickers back
// as later frames stream in on scroll — ambient feedback, not a hard gate.
function GalleryLoader() {
  const { active, progress } = useProgress()
  return (
    <div className={`gallery-loader${active ? ' is-loading' : ''}`} aria-hidden>
      <span style={{ width: `${progress}%` }} />
    </div>
  )
}

// The gallery page lays the photos out as REAL, invisible DOM cells in CSS
// grid clusters (magazine spreads, full-screen breaks, header bands). The
// WebGL scene (GalleryScene) mounts a textured plane per cell and follows its
// rect every frame — CSS owns layout + native scroll, WebGL owns rendering.
export default function GalleryPage() {
  const { slug = '' } = useParams()
  const setView = useAppStore((s) => s.setView)
  const bumpCells = useAppStore((s) => s.bumpCells)
  const gallery = getGallery(slug)

  const built = useMemo(() => (gallery ? buildGalleryBlocks(gallery) : null), [gallery])
  const cellEls = useRef<(HTMLElement | null)[]>([])

  // Tell the Canvas which gallery to show; reset to the index on leave.
  // Always enter a gallery at the top — restored/stale scroll positions jump
  // the cascade to the middle once textures finish loading.
  useEffect(() => {
    window.scrollTo(0, 0)
    if (gallery) setView('gallery', slug)
    return () => setView('index')
  }, [slug, gallery, setView])

  // Publish the mounted cells to the canvas; re-publish on resize so plane
  // geometry re-measures (positions track live every frame regardless).
  useLayoutEffect(() => {
    if (!built) return
    const register = () => {
      domGallery.cells = built.flat
        .map((f, i) => ({ ...f, el: cellEls.current[i]! }))
        .filter((c) => !!c.el)
      bumpCells()
    }
    register()
    let t = 0
    const onResize = () => {
      window.clearTimeout(t)
      t = window.setTimeout(register, 150)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.clearTimeout(t)
      domGallery.cells = []
      bumpCells()
    }
  }, [built, bumpCells])

  // Apply this gallery's theme to the DOM (the Canvas reads bg from the store).
  useEffect(() => {
    if (!gallery) return
    const root = document.documentElement
    root.style.setProperty('--bg', gallery.theme.bg)
    root.style.setProperty('--fg', gallery.theme.fg)
    if (gallery.theme.accent) root.style.setProperty('--accent', gallery.theme.accent)
    return () => {
      root.style.removeProperty('--bg')
      root.style.removeProperty('--fg')
      root.style.removeProperty('--accent')
    }
  }, [gallery])

  if (!gallery || !built) {
    return (
      <div className="gallery-ui">
        <p>Gallery not found.</p>
        <Link to="/" className="back-link">
          ← back
        </Link>
      </div>
    )
  }

  const ref = (i: number) => (el: HTMLElement | null) => {
    cellEls.current[i] = el
  }

  return (
    <>
      {import.meta.env.DEV && (
        <div className="dev-tools">
          <Leva titleBar={{ title: 'Gallery' }} />
          <GalleryTuningPanel />
        </div>
      )}
      <GalleryLoader />
      <div className="gallery-ui">
        <Link to="/" className="back-link">
          ← all galleries
        </Link>
        <h2 className="gallery-title">{gallery.title}</h2>
        {gallery.intro && <p className="gallery-intro">{gallery.intro}</p>}
      </div>

      {/* The invisible layout skeleton the WebGL planes track. Native scroll
          height comes from this content — no spacer math. */}
      <div className="g-flow" aria-hidden>
        {built.blocks.map((block, bi) =>
          block.type === 'map' ? (
            // Tall wrapper + sticky inner: the WebGL map plane tracks the inner
            // cell (pinned for the wrapper's extra height), and the map reads
            // its scroll progress from the wrapper to draw the route.
            <div key={bi} className="g-map-wrap">
              <div ref={ref(block.flatIndex)} className="g-map" />
            </div>
          ) : block.type === 'header' ? (
            <div key={bi} ref={ref(block.flatIndex)} className="g-header" />
          ) : block.type === 'full' ? (
            <div key={bi} ref={ref(block.flatIndex)} className="g-full" />
          ) : (
            <div key={bi} className={`g-cluster${block.tight ? ' g-cluster--tight' : ''}`}>
              {block.cells.map((c) => (
                <div
                  key={c.flatIndex}
                  ref={ref(c.flatIndex)}
                  className="g-cell"
                  style={{
                    gridColumn: c.col,
                    gridRow: c.row,
                    aspectRatio: c.aspect,
                    marginTop: c.offsetVh ? `${c.offsetVh}vh` : undefined,
                  }}
                />
              ))}
            </div>
          ),
        )}
      </div>

      {/* Real <img> tags, visually hidden — accessibility + a no-WebGL fallback. */}
      <ul className="sr-photos">
        {gallery.photos.map((p, i) => (
          <li key={i}>
            <img src={p.src.src} alt={p.alt} loading="lazy" />
          </li>
        ))}
      </ul>
    </>
  )
}
