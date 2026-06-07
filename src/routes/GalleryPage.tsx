import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getGallery } from '../lib/content'
import { useAppStore } from '../store/useAppStore'

export default function GalleryPage() {
  const { slug = '' } = useParams()
  const setView = useAppStore((s) => s.setView)
  const gallery = getGallery(slug)

  // Tell the Canvas which gallery to show; reset to the index on leave.
  useEffect(() => {
    if (gallery) setView('gallery', slug)
    return () => setView('index')
  }, [slug, gallery, setView])

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

  if (!gallery) {
    return (
      <div className="gallery-ui">
        <p>Gallery not found.</p>
        <Link to="/" className="back-link">
          ← back
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="gallery-ui">
        <Link to="/" className="back-link">
          ← all galleries
        </Link>
        <h2 className="gallery-title">{gallery.title}</h2>
        {gallery.intro && <p className="gallery-intro">{gallery.intro}</p>}
      </div>

      {/* Spacer drives native scroll; height scales with the number of photos. */}
      <div style={{ height: `${gallery.photos.length * 100}vh` }} aria-hidden />

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
