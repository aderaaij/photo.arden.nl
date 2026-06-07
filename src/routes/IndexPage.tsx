import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getGalleries } from '../lib/content'
import { useAppStore } from '../store/useAppStore'
import EffectSwitcher from '../components/EffectSwitcher'

export default function IndexPage() {
  const setView = useAppStore((s) => s.setView)
  const focusSlug = useAppStore((s) => s.focusSlug)
  useEffect(() => {
    setView('index')
  }, [setView])

  const galleries = getGalleries()
  const focused = galleries.find((g) => g.slug === focusSlug) ?? galleries[0]

  return (
    <>
      <EffectSwitcher />
      <header className="index-ui">
      <div className="index-top">
        <span className="brand">arden</span>
        <span className="site-sub">photography</span>
      </div>

      <div className="index-focus">
        <Link to={`/g/${focused.slug}`} className="focus-title" key={focused.slug}>
          {focused.title}
        </Link>
        <p className="focus-hint">drag or scroll · click to enter</p>
      </div>

      {/* Accessible / SEO list of every gallery (visually hidden). */}
      <nav className="sr-photos" aria-label="Galleries">
        {galleries.map((g) => (
          <Link key={g.slug} to={`/g/${g.slug}`}>
            {g.title}
          </Link>
        ))}
      </nav>
      </header>
    </>
  )
}
