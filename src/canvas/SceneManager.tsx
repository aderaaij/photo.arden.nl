import { Suspense } from 'react'
import { useAppStore } from '../store/useAppStore'
import { getGallery } from '../lib/content'
import IndexScene from './IndexScene'
import GalleryScene from './GalleryScene'

// Picks which scene the persistent Canvas renders, and sets the clear color
// from the active gallery's theme.
export default function SceneManager() {
  const view = useAppStore((s) => s.view)
  const activeSlug = useAppStore((s) => s.activeSlug)

  const gallery = activeSlug ? getGallery(activeSlug) : undefined
  const isGallery = view === 'gallery' && !!activeSlug

  return (
    <>
      {/* Galleries set a fixed theme background; the homepage manages its own
          background imperatively (lerping toward the focused cover's color). */}
      {isGallery && gallery && (
        <color attach="background" args={[gallery.theme.bg]} />
      )}
      <Suspense fallback={null}>
        {isGallery ? <GalleryScene slug={activeSlug!} /> : <IndexScene />}
      </Suspense>
    </>
  )
}
