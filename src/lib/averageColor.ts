import * as THREE from 'three'

// Average color of an image, used to tint the background toward the focused
// cover. Works because the placeholder photos are same-origin — a cross-origin
// image without CORS would taint the canvas and getImageData would throw.

const cache = new Map<string, THREE.Color>()

export async function getAverageColor(url: string): Promise<THREE.Color> {
  const cached = cache.get(url)
  if (cached) return cached

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = url
  await img.decode()

  // Downscale to 1×1 — the browser averages the pixels for us.
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data

  const color = new THREE.Color(r / 255, g / 255, b / 255)
  cache.set(url, color)
  return color
}
