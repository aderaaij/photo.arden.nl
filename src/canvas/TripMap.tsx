import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import geo from '../content/japan-geo.json'
import { livePalette } from '../lib/palette'
import type { GalleryTheme, Trip, TripStop } from '../types'
import vertexShader from '../shaders/map.vert'
import fragmentShader from '../shaders/map.frag'

// ─────────────────────────────────────────────────────────────────────────────
// TRIP ROUTE MAP — the recurring waypoint motif of a trip gallery.
//
// A flat, stylized dot-matrix Japan that returns before every chapter:
//   leg 0  — the map fades in and the first stop pops with a pulsing halo
//   leg k  — the map fades back in with the journey-so-far as quiet context,
//            then draws the leg from stop k-1 to stop k and pulses the arrival
// Everything is driven by the sticky cell's scroll progress (reversible), in
// the same position-driven spirit as the section headers; only the arrival
// halo runs on time, looping while the cell is pinned.
//
// Coordinates: the map is built in "map units" — width = aspect, height = 1,
// origin at the center — inside a group scaled to fit the viewport cell.
// ─────────────────────────────────────────────────────────────────────────────

type Pt = [number, number]
const ASPECT = geo.aspect as number
const ISLANDS = geo.islands as Pt[][]
const BOUNDS = geo.bounds as {
  lonMin: number
  lonMax: number
  latMin: number
  latMax: number
  k: number
}

// Reveal windows within the pinned scroll (fractions of total map progress).
const LAND_WINDOW: Pt = [0.02, 0.32] // land + journey-so-far fade in
const LEG_WINDOW: Pt = [0.4, 0.82] // current leg draws
const ARRIVE_WINDOW: Pt = [0.82, 0.9] // arrival stop pops
const INTRO_LEG_WINDOW: Pt = [0.14, 0.54] // leg 0: the flight in draws
const INTRO_WINDOW: Pt = [0.54, 0.66] // leg 0: first stop pops
const GRID_ROWS = 110 // land halftone resolution (dots along the map's height)

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function inRing(x: number, y: number, ring: Pt[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** lon/lat → centered map units (x right, y up). */
function project(lon: number, lat: number): Pt {
  const nx = (lon - BOUNDS.lonMin) / (BOUNDS.lonMax - BOUNDS.lonMin)
  const ny = (lat - BOUNDS.latMin) / (BOUNDS.latMax - BOUNDS.latMin)
  return [nx * ASPECT - ASPECT / 2, ny - 0.5]
}

// ── land halftone, generated once at module load ─────────────────────────────
const land = (() => {
  const boxes = ISLANDS.map((ring) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const [x, y] of ring) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y)
      x1 = Math.max(x1, x); y1 = Math.max(y1, y)
    }
    return { ring, x0, y0, x1, y1 }
  })
  const rng = mulberry32(0x4a50) // 'JP' — deterministic layout
  const step = 1 / GRID_ROWS
  const cols = Math.round(GRID_ROWS * ASPECT)
  const pos: number[] = []
  const t: number[] = []
  const size: number[] = []
  for (let gy = 0; gy <= GRID_ROWS; gy++) {
    for (let gx = 0; gx <= cols; gx++) {
      // Normalized sample point, jittered off the rigid grid.
      const nx = (gx + (rng() - 0.5) * 0.55) / cols
      const ny = (gy + (rng() - 0.5) * 0.55) / GRID_ROWS
      let hit = false
      for (const b of boxes) {
        if (nx < b.x0 || nx > b.x1 || ny < b.y0 || ny > b.y1) continue
        if (inRing(nx, ny, b.ring)) { hit = true; break }
      }
      if (!hit) continue
      pos.push(nx * ASPECT - ASPECT / 2, ny - 0.5, 0)
      // Pure random stagger: the land fades in as grain, no directional wipe.
      t.push(rng() * 0.92)
      size.push(0.75 + rng() * 0.5)
    }
  }

  // Origins for the intro morph: each dot starts smeared sideways from its
  // own place on the coastline — a hazy horizontal band, never a rectangle —
  // and condenses (mostly horizontally) into Japan. Triangular distribution:
  // dense near the target with long soft tails.
  const n = pos.length / 3
  const orng = mulberry32(0x4a51)
  const origin: number[] = []
  for (let i = 0; i < n; i++) {
    const dx = (orng() + orng() - 1) * ASPECT * 0.85
    const dy = (orng() + orng() - 1) * 0.07
    origin.push(pos[i * 3] + dx, pos[i * 3 + 1] + dy, 0)
  }

  return {
    position: new Float32Array(pos),
    t: new Float32Array(t),
    size: new Float32Array(size),
    origin: new Float32Array(origin),
    step,
  }
})()

function makeUniforms(
  color: string,
  alpha: number,
  window: Pt,
  pop: number,
  opts: { ring?: boolean; pulse?: boolean } = {},
) {
  return {
    uProgress: { value: 0 },
    uP0: { value: window[0] },
    uP1: { value: window[1] },
    uPointSize: { value: 1 },
    uScale: { value: 1 },
    uPop: { value: pop },
    uColor: { value: new THREE.Color(color) },
    uAlpha: { value: alpha },
    uRing: { value: opts.ring ? 1 : 0 },
    uPulse: { value: opts.pulse ? 1 : 0 },
    uTime: { value: 0 },
    uMorph: { value: 1 },
  }
}

type DotUniforms = ReturnType<typeof makeUniforms>

function DotLayer({
  position,
  t,
  size,
  origin,
  uniforms,
}: {
  position: Float32Array
  t: Float32Array
  size: Float32Array
  /** Lattice start for the intro morph; layers without one stay in place. */
  origin?: Float32Array
  uniforms: DotUniforms
}) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(position, 3))
    g.setAttribute('aT', new THREE.BufferAttribute(t, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    g.setAttribute('aOrigin', new THREE.BufferAttribute(origin ?? position, 3))
    return g
  }, [position, t, size, origin])
  useEffect(() => () => geometry.dispose(), [geometry])
  if (t.length === 0) return null
  return (
    <points geometry={geometry}>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </points>
  )
}

/** Single-dot helper for stop markers and halos. */
function dot(at: Pt, t = 0): { position: Float32Array; t: Float32Array; size: Float32Array } {
  return {
    position: new Float32Array([at[0], at[1], 0.002]),
    t: new Float32Array([t]),
    size: new Float32Array([1]),
  }
}

/** Small romaji caption beside a stop marker, fading in with it. The glyphs
 *  are baked white and tinted per frame from the live palette, so labels stay
 *  legible while the background crossfades between section themes. */
function StopLabel({
  stop,
  at,
  opacityRef,
}: {
  stop: TripStop
  at: Pt
  opacityRef: { current: number }
}) {
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const { texture, aspect } = useMemo(() => {
    const text = stop.name.toUpperCase()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const fs = 36
    const font = `500 ${fs}px ui-sans-serif, system-ui, -apple-system, sans-serif`
    ctx.font = font
    const track = fs * 0.18 // manual letterspacing — canvas2d support varies
    const wPx = [...text].reduce((w, c) => w + ctx.measureText(c).width + track, 0)
    canvas.width = Math.ceil(wPx + fs)
    canvas.height = Math.ceil(fs * 1.6)
    ctx.font = font
    ctx.fillStyle = '#ffffff'
    ctx.textBaseline = 'middle'
    let x = fs / 2
    for (const c of text) {
      ctx.fillText(c, x, canvas.height / 2)
      x += ctx.measureText(c).width + track
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.NoColorSpace
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    return { texture: tex, aspect: canvas.width / canvas.height }
  }, [stop.name])
  useEffect(() => () => texture.dispose(), [texture])

  useFrame(() => {
    if (!mat.current) return
    mat.current.opacity = opacityRef.current
    mat.current.color.copy(livePalette.fg)
  })

  // Sized/positioned in map units (this mesh lives inside the scaled group).
  const h = 0.034
  const w = h * aspect
  const gap = 0.022
  const dx = stop.labelDir === 'left' ? -(gap + w / 2) : gap + w / 2
  return (
    <mesh position={[at[0] + dx, at[1], 0.003]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial ref={mat} map={texture} transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

export default function TripMap({
  trip,
  theme,
  width,
  height,
  el,
  leg,
}: {
  trip: Trip
  theme: GalleryTheme
  width: number
  height: number
  el: HTMLElement
  /** 0 = intro (first stop appears); k = journey from stop k-1 to stop k. */
  leg: number
}) {
  const size = useThree((s) => s.size)
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const progress = useRef(0)
  // Mount-driven intro (leg 0 only): the land assembles by itself on load,
  // no scroll needed. Starts negative for a beat of paper before the morph.
  const intro = useRef(leg === 0 ? -0.18 : 1)

  // Fit the unit-tall map into the cell, height-led, clamped by width.
  const s = Math.min(height * 0.84, (width * 0.9) / ASPECT)

  const accent = theme.accent ?? theme.fg

  // Route through the stops: one gentle quadratic arc per leg (flight-path
  // bow), resampled into evenly spaced dots. Legs are independent, so a short
  // hop next to a long haul can't make the curve overshoot the map.
  const route = useMemo(() => {
    const pts = trip.stops.map((st) => project(st.lon, st.lat))
    const dots: { x: number; y: number; len: number; seg: number }[] = []
    const stopLen: number[] = [0]
    let total = 0
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i]
      const [bx, by] = pts[i + 1]
      const dx = bx - ax
      const dy = by - ay
      const len = Math.hypot(dx, dy)
      // Control point: midpoint pushed perpendicular-left of travel.
      const cx = ax + dx / 2 - (dy / len) * len * 0.14
      const cy = ay + dy / 2 + (dx / len) * len * 0.14
      const n = Math.max(4, Math.round(len / (land.step * 1.7)))
      for (let j = i === 0 ? 0 : 1; j <= n; j++) {
        const u = j / n
        const x = (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * cx + u * u * bx
        const y = (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * cy + u * u * by
        const prev = dots[dots.length - 1]
        total += prev ? Math.hypot(x - prev.x, y - prev.y) : 0
        dots.push({ x, y, len: total, seg: i })
      }
      stopLen.push(total)
    }
    return { dots, stops: pts, stopLen }
  }, [trip])

  // Split the route into journey-so-far (segments before this leg, fading in
  // with the land as context) and the current leg (drawn by the scroll).
  const split = useMemo(() => {
    const pack = (ds: typeof route.dots, t: (d: (typeof route.dots)[0]) => number) => {
      const position = new Float32Array(ds.length * 3)
      const tArr = new Float32Array(ds.length)
      const size = new Float32Array(ds.length).fill(1)
      ds.forEach((d, i) => {
        position.set([d.x, d.y, 0.001], i * 3)
        tArr[i] = t(d)
      })
      return { position, t: tArr, size }
    }
    const pastDots = route.dots.filter((d) => d.seg < leg - 1)
    const pastLen = route.stopLen[Math.max(0, leg - 1)]
    // Past legs quickly re-trace start→end while the land fades in.
    const past = pack(pastDots, (d) => (pastLen > 0 ? (d.len / pastLen) * 0.85 : 0))

    if (leg === 0) {
      // The flight in: an approach arc from off-screen north-west descending
      // into the first stop, drawn by the scroll like any other leg.
      const [bx, by] = route.stops[0]
      const ax = -ASPECT * 0.95
      const ay = by + 0.24
      const dx = bx - ax
      const dy = by - ay
      const len = Math.hypot(dx, dy)
      const cx = ax + dx / 2 - (dy / len) * len * 0.14
      const cy = ay + dy / 2 + (dx / len) * len * 0.14
      const n = Math.max(4, Math.round(len / (land.step * 1.7)))
      const approach: { x: number; y: number; len: number; seg: number }[] = []
      let acc = 0
      for (let j = 0; j <= n; j++) {
        const u = j / n
        const x = (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * cx + u * u * bx
        const y = (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * cy + u * u * by
        const prev = approach[approach.length - 1]
        acc += prev ? Math.hypot(x - prev.x, y - prev.y) : 0
        approach.push({ x, y, len: acc, seg: -1 })
      }
      return { past, cur: pack(approach, (d) => (d.len / acc) * 0.94) }
    }

    const curDots = route.dots.filter((d) => d.seg === leg - 1)
    const a = route.stopLen[leg - 1] ?? 0
    const b = route.stopLen[leg] ?? 1
    const cur = pack(curDots, (d) => ((d.len - a) / Math.max(b - a, 1e-6)) * 0.94)
    return { past, cur }
  }, [route, leg])

  const arriveWindow = leg === 0 ? INTRO_WINDOW : ARRIVE_WINDOW

  const landUniforms = useMemo(() => makeUniforms(theme.fg, 0.42, LAND_WINDOW, 0.1), [theme.fg])
  const pastUniforms = useMemo(() => makeUniforms(accent, 0.4, LAND_WINDOW, 0.08), [accent])
  const curUniforms = useMemo(
    () => makeUniforms(accent, 0.95, leg === 0 ? INTRO_LEG_WINDOW : LEG_WINDOW, 0.05),
    [accent, leg],
  )
  const visitedUniforms = useMemo(() => makeUniforms(accent, 0.55, LAND_WINDOW, 0.2), [accent])
  const arriveUniforms = useMemo(
    () => makeUniforms(accent, 1, arriveWindow, 0.6),
    [accent, arriveWindow],
  )
  const pulseUniforms = useMemo(
    () => makeUniforms(accent, 0.9, arriveWindow, 0.6, { pulse: true }),
    [accent, arriveWindow],
  )

  // Visited stops (small, quiet) and the arrival stop (popped + pulsing halo).
  const visitedMarkers = useMemo(() => {
    const idx = [...Array(leg).keys()]
    const position = new Float32Array(idx.length * 3)
    const t = new Float32Array(idx.length)
    const size = new Float32Array(idx.length).fill(1)
    idx.forEach((i) => {
      position.set([route.stops[i][0], route.stops[i][1], 0.002], i * 3)
      t[i] = 0.3
    })
    return { position, t, size }
  }, [route, leg])
  const arriveMarker = useMemo(() => dot(route.stops[leg]), [route, leg])

  // Label opacities, one mutable ref per stop, written in this frame loop and
  // read by each StopLabel — keeps reveal math in one place.
  const labelOpacity = useMemo(() => trip.stops.map(() => ({ current: 0 })), [trip])

  useFrame(({ clock }, delta) => {
    // Progress = how far the sticky cell has travelled through its tall
    // wrapper: 0 when the map pins, 1 just before it releases.
    const wrap = el.parentElement
    if (wrap) {
      const r = wrap.getBoundingClientRect()
      const travel = Math.max(1, r.height - window.innerHeight)
      const p = THREE.MathUtils.clamp(-r.top / travel, 0, 1)
      progress.current += (p - progress.current) * 0.14 // soft glide, reversible
    }
    intro.current = Math.min(1, intro.current + delta / 3.2)

    const fov = (camera as THREE.PerspectiveCamera).fov ?? 45
    const scalePx = (size.height * gl.getPixelRatio()) / (2 * Math.tan((fov * Math.PI) / 360))
    const dotSize = land.step * s // grid pitch in world units

    const apply = (u: DotUniforms, pointSize: number) => {
      u.uProgress.value = progress.current
      u.uScale.value = scalePx
      u.uPointSize.value = pointSize
      u.uTime.value = clock.elapsedTime
    }
    apply(landUniforms, dotSize * 0.6)
    apply(pastUniforms, dotSize * 0.7)
    apply(curUniforms, dotSize * 0.85)
    apply(visitedUniforms, dotSize * 1.5)
    apply(arriveUniforms, dotSize * 1.9)
    apply(pulseUniforms, dotSize * 5.2)

    // Follow the live section palette, so ink and route stay legible while
    // the page background crossfades between chapters.
    landUniforms.uColor.value.copy(livePalette.fg)
    for (const u of [pastUniforms, curUniforms, visitedUniforms, arriveUniforms, pulseUniforms])
      u.uColor.value.copy(livePalette.accent)

    if (leg === 0) {
      // Leg 0's land plays on mount: fade and morph share the clock, so each
      // dot fades in mid-flight while drifting toward the coastline. The
      // flight-in arc and the first stop stay scroll-driven. max() keeps the
      // land scroll-compatible: a fast scroller just takes over.
      const introT = THREE.MathUtils.clamp(intro.current, 0, 1)
      const fade = THREE.MathUtils.clamp(introT / 0.85, 0, 1)
      landUniforms.uProgress.value = Math.max(progress.current, LAND_WINDOW[1] * fade)
      landUniforms.uMorph.value = introT
    }

    // Labels: visited ones ride the land fade, the arrival rides its pop.
    const ramp = (p: number, w: Pt, t: number) =>
      THREE.MathUtils.clamp((p - w[0] - t * (w[1] - w[0])) / 0.06, 0, 1)
    trip.stops.forEach((_, i) => {
      labelOpacity[i].current =
        i < leg
          ? ramp(progress.current, LAND_WINDOW, 0.5) * 0.7
          : i === leg
            ? ramp(progress.current, arriveWindow, 0.6)
            : 0
    })
  })

  return (
    <group scale={[s, s, 1]}>
      <DotLayer
        position={land.position}
        t={land.t}
        size={land.size}
        origin={leg === 0 ? land.origin : undefined}
        uniforms={landUniforms}
      />
      <DotLayer {...split.past} uniforms={pastUniforms} />
      <DotLayer {...split.cur} uniforms={curUniforms} />
      <DotLayer {...visitedMarkers} uniforms={visitedUniforms} />
      <DotLayer {...arriveMarker} uniforms={arriveUniforms} />
      <DotLayer {...arriveMarker} uniforms={pulseUniforms} />
      {trip.stops.slice(0, leg + 1).map((stop, i) => (
        <StopLabel key={stop.id} stop={stop} at={route.stops[i]} opacityRef={labelOpacity[i]} />
      ))}
    </group>
  )
}
