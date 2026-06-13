import { memo, Suspense, useEffect, useMemo, useRef } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { useInView } from '../hooks/useInView'
import { enqueueUpload } from '../lib/textureQueue'

// Cap the GPU-side texture size. The served WebP is already long-edge ≤2560
// (see galleries.ts); this matches it, so the crisp 2560 frames upload as-is
// and anything larger (e.g. a hand-dropped original) is downscaled on arrival
// rather than costing ~50MB of VRAM each.
const MAX_TEX = 2560

// How far outside the viewport a photo starts loading. rootMargin grows the
// observed band by one viewport-height above and below, so a frame is usually
// decoded and uploaded by the time it scrolls in, while everything further out
// stays unfetched. Wider = smoother on fast flicks but more eager network.
const PRELOAD_MARGIN = '100% 0px'

// A single gallery frame: a fixed-size plane (sized by its DOM grid cell) with
// the photo center-cropped (object-fit: cover) to fill it.
//
// Lazy: the texture isn't fetched until the frame is cleared to load, and each
// frame owns its OWN Suspense boundary so one slow photo never blanks the whole
// scene (the way a single shared boundary would). Until then nothing draws there
// and the themed background shows through; it fades in on decode.
//
// Two load triggers:
//   • `load` controlled by the parent — chaptered (trip) galleries prefetch a
//     whole chapter as its route map scrolls in, so photos are on the GPU before
//     they appear and scrolling stays smooth (no per-frame work as each enters).
//   • `load` omitted — flat galleries self-observe the cell and load it once it
//     nears the viewport.
function GalleryPhoto({
  url,
  width,
  height,
  el,
  load,
}: {
  url: string
  width: number
  height: number
  /** The cell's DOM element, observed (flat galleries) to decide when to load. */
  el?: HTMLElement
  /** Parent-driven load gate (chaptered galleries); omit to self-observe. */
  load?: boolean
}) {
  // Only run the per-photo observer when the parent isn't driving the gate.
  const near = useInView(el, PRELOAD_MARGIN, load === undefined)
  const shouldLoad = load ?? near
  return (
    <Suspense fallback={null}>
      {shouldLoad ? <PhotoMesh url={url} width={width} height={height} /> : null}
    </Suspense>
  )
}

// Memoized: the gallery re-renders every frame while the mount cursor ramps, but
// a frame only flips `load` for the couple of photos crossing the cursor — the
// rest skip reconciliation entirely (props are otherwise stable per cell).
export default memo(GalleryPhoto)

function PhotoMesh({
  url,
  width,
  height,
}: {
  url: string
  width: number
  height: number
}) {
  const source = useTexture(url)
  const material = useRef<THREE.MeshBasicMaterial>(null)
  const img = source.image as HTMLImageElement | undefined
  const imgAspect =
    img?.naturalWidth && img?.naturalHeight
      ? img.naturalWidth / img.naturalHeight
      : width / height

  // Downscale oversized photos into a canvas-backed texture; small ones pass
  // through untouched.
  const texture = useMemo(() => {
    if (!img || Math.max(img.naturalWidth, img.naturalHeight) <= MAX_TEX) return source
    const scale = MAX_TEX / Math.max(img.naturalWidth, img.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return new THREE.CanvasTexture(canvas)
  }, [source, img])

  // Dispose derived textures when they're swapped out.
  useEffect(() => {
    if (texture === source) return
    return () => texture.dispose()
  }, [texture, source])

  // Pre-warm the texture so it never hitches the frame it's first drawn:
  // decode the pixels off-thread (TextureLoader resolves on download, not
  // decode — so an undecoded image would otherwise decode *synchronously* at
  // upload), then hand it to the queue, which spreads the GPU uploads across
  // frames ahead of view. Canvas-backed (downscaled) textures are already
  // rasterized, so they skip straight to the queue.
  useEffect(() => {
    const img = texture.image as { decode?: () => Promise<void> } | undefined
    let cancelled = false
    const enqueue = () => {
      if (!cancelled) enqueueUpload(texture)
    }
    if (img && typeof img.decode === 'function') img.decode().then(enqueue, enqueue)
    else enqueue()
    return () => {
      cancelled = true
    }
  }, [texture])

  // Pass-through color (ColorManagement is disabled app-wide) + cover-crop via
  // the texture's repeat/offset so the image fills the frame without distortion.
  useEffect(() => {
    texture.colorSpace = THREE.NoColorSpace
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = true
    texture.anisotropy = 8
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping

    const slotAspect = width / height
    if (imgAspect > slotAspect) {
      const r = slotAspect / imgAspect
      texture.repeat.set(r, 1)
      texture.offset.set((1 - r) / 2, 0)
    } else {
      const r = imgAspect / slotAspect
      texture.repeat.set(1, r)
      texture.offset.set(0, (1 - r) / 2)
    }
    texture.needsUpdate = true
  }, [texture, imgAspect, width, height])

  // Fade in once decoded. useTexture has already suspended until the image was
  // ready, so this runs the moment the frame first mounts — masking the pop-in
  // as lazily-loaded frames stream in during scroll.
  useEffect(() => {
    const m = material.current
    if (!m) return
    const tween = gsap.fromTo(
      m,
      { opacity: 0 },
      { opacity: 1, duration: 0.6, ease: 'power2.out' },
    )
    return () => {
      tween.kill()
    }
  }, [])

  return (
    <mesh>
      <planeGeometry args={[width, height, 1, 1]} />
      <meshBasicMaterial
        ref={material}
        map={texture}
        toneMapped={false}
        transparent
        opacity={0}
      />
    </mesh>
  )
}
