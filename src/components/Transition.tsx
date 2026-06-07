import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import gsap from 'gsap'

// Placeholder transition: a simple curtain wipe on every route change.
// TODO: replace with the WebGL gallery-open transition (shader wipe / camera
// move on the persistent Canvas) — this just marks the hook point.
export default function Transition() {
  const ref = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const tween = gsap.fromTo(
      el,
      { scaleY: 1 },
      { scaleY: 0, duration: 0.8, ease: 'power3.inOut' },
    )
    return () => {
      tween.kill()
    }
  }, [pathname])

  return <div ref={ref} className="transition-curtain" aria-hidden />
}
