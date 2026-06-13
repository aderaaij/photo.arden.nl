import type * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────────────
// GPU TEXTURE UPLOAD QUEUE
//
// three uploads a texture to the GPU lazily, on the first frame its mesh is
// drawn — so a photo hitches the very frame it scrolls into view (a ~2560px
// upload + mipmap gen is several ms; a few coinciding is a dropped frame).
//
// Chapter loading already decodes a chapter's photos ~2.5 viewports early (its
// route-map intro). This queue uses that runway: PhotoMesh enqueues each decoded
// texture, and GalleryScene drains a couple per frame via renderer.initTexture,
// so uploads are spread across frames and paid BEFORE the plane is on-screen.
// By the time the photo scrolls in, it's already resident — no first-draw spike.
// ─────────────────────────────────────────────────────────────────────────────

const queue: THREE.Texture[] = []
const seen = new WeakSet<THREE.Texture>()

/** Queue a decoded texture for a spread-out GPU upload (no-op if already queued
 *  or uploaded). */
export function enqueueUpload(tex: THREE.Texture): void {
  if (seen.has(tex)) return
  seen.add(tex)
  queue.push(tex)
}

/** Upload up to `max` queued textures now. Called once per frame from the
 *  gallery's render loop; keeps the per-frame upload cost bounded. */
export function drainUploads(gl: THREE.WebGLRenderer, max = 2): void {
  for (let i = 0; i < max && queue.length; i++) {
    gl.initTexture(queue.shift()!)
  }
}
