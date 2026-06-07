# photo.arden.nl

A photography portfolio that doubles as a WebGL/3D showcase. Frontpage gallery
picker → WebGL transition → per-gallery scroll experience with shader reveals
(pixelated→clear, pointcloud→image, displacement). Per-gallery typography and
color.

## Stack

- **Vite + React + TypeScript** — SPA, fast WebGL dev loop
- **React Three Fiber + drei + postprocessing** — declarative Three.js
- **GSAP + Lenis** — animation timelines + smooth scroll
- **GLSL** (via `vite-plugin-glsl`) — the reveal shaders
- **Zustand** — state shared across the React/Canvas boundary
- **React Router** — shareable per-gallery URLs
- **vite-imagetools** — build-time responsive images (for when real photos land)

## Run

```bash
pnpm install
pnpm dev        # start dev server
pnpm build      # typecheck + production build
pnpm preview    # preview the build
```

## Architecture

- A single **persistent `<Canvas>`** lives in `Layout` and never unmounts, so
  transitions can span route changes. `SceneManager` swaps `IndexScene` /
  `GalleryScene` based on the store.
- The R3F Canvas is **behind** a `pointer-events: none` DOM overlay; interactive
  DOM elements opt back in. 3D objects are clickable directly.
- React context does **not** cross into the Canvas, so cross-boundary state
  (current view, scroll progress, the `navigate` fn) goes through the Zustand
  store, read with `getState()` inside `useFrame` to avoid re-renders.

## Content

All content goes through `src/lib/content.ts` — the **only** module the app
imports for gallery data. To migrate later (Keystatic on the same files, or
Sanity), swap the bodies of `getGalleries()` / `getGallery()` — nothing else
changes.

**Adding photos is drop-and-go.** Put image files in `src/photos/<slug>/`:

- a file named `cover.*` becomes the gallery cover (else the first image)
- the rest become the gallery, in filename order (`01.jpg`, `02.jpg`, …)
- alt text is derived from the filename; aspect ratios are read at runtime
- folder name = gallery slug

Gallery **titles, intros, themes, and order** live in
`src/content/galleries.config.ts`. A folder with images but no config entry still
appears, using a default theme. Images are same-origin (in `src/`) so textures
load with no CORS issues and the background can sample their color.

Placeholder gradients can be regenerated with `node scripts/gen-placeholders.mjs`.

## Known TODOs (flagged in code)

- **Color management** (`SceneCanvas.tsx`): currently pass-through for safety;
  move to a proper linear workflow before launch — color fidelity matters most
  for the photography.
- **WebGL transition** (`Transition.tsx`): currently a DOM curtain placeholder;
  replace with a shader/camera transition on the persistent Canvas.
- **Reveal family**: `pixelate` shader is in; `pointcloud` and `displace` are
  declared in the data model but not yet implemented.
- **Mobile strategy**: decide lighter effects vs. static grid below a capability
  threshold.
- **Texture weight**: add responsive sizes + consider KTX2/Basis for real photos.
