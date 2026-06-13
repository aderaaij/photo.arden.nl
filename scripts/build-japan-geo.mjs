// One-time generator for src/content/japan-geo.json — the stylized map's
// island outlines. Decodes Natural Earth 50m (world-atlas topojson), keeps
// Japan's main islands, projects to a flat local plane and normalizes to a
// 0..1 box. Re-run only if you want different islands/resolution:
//   node scripts/build-japan-geo.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../src/content/japan-geo.json')
const URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'

const topo = await (await fetch(URL)).json()

// ── decode topojson arcs (delta-encoded, quantized) ─────────────────────────
const { scale, translate } = topo.transform
const arcs = topo.arcs.map((arc) => {
  let x = 0
  let y = 0
  return arc.map(([dx, dy]) => {
    x += dx
    y += dy
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]]
  })
})

function ring(arcIndexes) {
  const pts = []
  for (const i of arcIndexes) {
    const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i]
    for (let j = pts.length ? 1 : 0; j < a.length; j++) pts.push(a[j])
  }
  return pts
}

const japan = topo.objects.countries.geometries.find((g) => g.id === '392')
const rings = japan.arcs.map((poly) => ring(poly[0])) // outer rings only

// ── keep the main islands ────────────────────────────────────────────────────
// Drop the Ryukyu chain (Okinawa etc., centroid below ~30.5°N) so the frame
// stays tight on the Tokyo→Hokkaido→Kyushu route, and drop dot-sized islets.
function areaAndCentroidLat(r) {
  let a = 0
  let cy = 0
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i]
    const [x2, y2] = r[(i + 1) % r.length]
    const cross = x1 * y2 - x2 * y1
    a += cross
    cy += (y1 + y2) * cross
  }
  a /= 2
  return { area: Math.abs(a), centroidLat: a === 0 ? r[0][1] : cy / (6 * a) }
}

const kept = rings.filter((r) => {
  const { area, centroidLat } = areaAndCentroidLat(r)
  return centroidLat > 30.5 && area > 0.01
})

// ── project + normalize ──────────────────────────────────────────────────────
let lonMin = Infinity, lonMax = -Infinity, latMin = Infinity, latMax = -Infinity
for (const r of kept)
  for (const [lon, lat] of r) {
    lonMin = Math.min(lonMin, lon); lonMax = Math.max(lonMax, lon)
    latMin = Math.min(latMin, lat); latMax = Math.max(latMax, lat)
  }
const k = Math.cos((((latMin + latMax) / 2) * Math.PI) / 180)
const W = (lonMax - lonMin) * k
const H = latMax - latMin
const round = (v) => Math.round(v * 1e4) / 1e4
const islands = kept.map((r) =>
  r.map(([lon, lat]) => [round(((lon - lonMin) * k) / W), round((lat - latMin) / H)]),
)

const out = {
  aspect: W / H, // map width / height in projected units
  bounds: { lonMin: round(lonMin), lonMax: round(lonMax), latMin: round(latMin), latMax: round(latMax), k: round(k) },
  islands,
}
writeFileSync(OUT, JSON.stringify(out))
console.log(
  `kept ${islands.length}/${rings.length} islands, ${islands.reduce((n, r) => n + r.length, 0)} points, aspect ${out.aspect.toFixed(3)}`,
)
