import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import glsl from 'vite-plugin-glsl'
import { imagetools } from 'vite-imagetools'

// glsl()      -> import .glsl/.vert/.frag as strings (with #include support)
// imagetools() -> import local images with ?w=...&format=... query params for
//                 build-time responsive/optimized variants (used once we add real photos)
export default defineConfig({
  plugins: [react(), glsl(), imagetools()],
})
