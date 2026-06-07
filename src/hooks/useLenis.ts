import { useEffect } from 'react'
import Lenis from 'lenis'
import { useAppStore } from '../store/useAppStore'

// Smooth scroll. Publishes 0..1 page progress into the store so scenes inside
// the Canvas can read it (via getState) without triggering React re-renders.
export function useLenis() {
  useEffect(() => {
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
