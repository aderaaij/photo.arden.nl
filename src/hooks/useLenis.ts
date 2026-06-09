import { useEffect } from 'react'
import Lenis from 'lenis'
import { useAppStore } from '../store/useAppStore'

// Smooth scroll. Publishes 0..1 page progress into the store so scenes inside
// the Canvas can read it (via getState) without triggering React re-renders.
export function useLenis() {
  useEffect(() => {
    // The browser restoring scroll on reload fights Lenis + the canvas scenes
    // (it lands mid-page once the photos finish decoding). Scroll state is
    // ours; every route decides its own starting position.
    history.scrollRestoration = 'manual'
    const lenis = new Lenis({ smoothWheel: true })

    let raf = 0
    const loop = (time: number) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const onScroll = ({ progress }: { progress: number }) => {
      useAppStore.getState().setScroll(Number.isFinite(progress) ? progress : 0)
    }
    lenis.on('scroll', onScroll)

    return () => {
      cancelAnimationFrame(raf)
      lenis.off('scroll', onScroll)
      lenis.destroy()
    }
  }, [])
}
