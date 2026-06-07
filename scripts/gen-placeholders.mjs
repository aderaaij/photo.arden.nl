// Generates local placeholder photos into src/photos/<slug>/ so the scaffold
// runs offline with no CORS issues (remote hosts like picsum don't send the
// access-control-allow-origin header WebGL textures need). Replace these files
// with real photos later — same folders.
//
//   node scripts/gen-placeholders.mjs

import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const OUT = new URL('../src/photos/', import.meta.url)

const galleries = [
  { slug: 'lisbon-nights', hue: 265, count: 6 },
  { slug: 'coastal', hue: 195, count: 7 },
  { slug: 'portraits', hue: 28, count: 5 },
]

const W = 1200
const H = 1500

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360
  const a = s * Math.min(l, 1 - l)
  const f = (n) => {
    const k = (n + h * 12) % 12
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return [f(0) * 255, f(8) * 255, f(4) * 255]
}

function gradientBuffer(hueA, hueB, lA, lB) {
  const buf = Buffer.alloc(W * H * 3)
  const [r1, g1, b1] = hslToRgb(hueA, 0.5, lA)
  const [r2, g2, b2] = hslToRgb(hueB, 0.55, lB)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = (x / W + y / H) / 2 // diagonal blend
      const dx = x / W - 0.5
      const dy = y / H - 0.5
      const vig = 1 - Math.min(1, (dx * dx + dy * dy) * 1.6) // soft vignette
      const i = (y * W + x) * 3
      buf[i] = Math.round((r1 + (r2 - r1) * t) * vig)
      buf[i + 1] = Math.round((g1 + (g2 - g1) * t) * vig)
      buf[i + 2] = Math.round((b1 + (b2 - b1) * t) * vig)
    }
  }
  return buf
}

async function writeImg(path, hueA, hueB, lA, lB) {
  const buf = gradientBuffer(hueA, hueB, lA, lB)
  await sharp(buf, { raw: { width: W, height: H, channels: 3 } })
    .jpeg({ quality: 82 })
    .toFile(path)
  console.log('wrote', path)
}

for (const g of galleries) {
  const dir = new URL(`${g.slug}/`, OUT)
  await mkdir(dir, { recursive: true })
  await writeImg(new URL('cover.jpg', dir).pathname, g.hue, g.hue + 40, 0.28, 0.5)
  for (let n = 1; n <= g.count; n++) {
    const hueA = g.hue + ((n * 13) % 60) - 30
    const hueB = hueA + 35
    const lA = 0.22 + ((n * 7) % 20) / 100
    const lB = 0.45 + ((n * 11) % 25) / 100
    const file = String(n).padStart(2, '0') + '.jpg'
    await writeImg(new URL(file, dir).pathname, hueA, hueB, lA, lB)
  }
}

console.log('done')
