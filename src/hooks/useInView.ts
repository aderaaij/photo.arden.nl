import { useEffect, useState } from 'react'

// Latches true the first time `el` comes within `rootMargin` of the viewport,
// then stays true. Used to lazy-load gallery textures: the invisible DOM grid
// cells already carry real layout (the WebGL planes track their rects), so we
// observe them directly and only fetch a photo once its cell nears the screen.
// The latch means a photo, once loaded, is never torn down and refetched as it
// scrolls back out — load grows toward "everything visited", never thrashes.
export function useInView(
  el: HTMLElement | null | undefined,
  rootMargin = '0px',
  enabled = true,
): boolean {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    if (!enabled || !el || inView) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true) // no IO (old/SSR env): don't gate, just load
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [el, rootMargin, inView, enabled])
  return inView
}
