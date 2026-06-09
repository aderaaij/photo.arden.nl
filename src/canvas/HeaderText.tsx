import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import vertexShader from '../shaders/header.vert'
import fragmentShader from '../shaders/header.frag'
import { headerTuning } from '../lib/headerTuning'

// A section header: the label rendered to a canvas texture, mapped onto a plane,
// cut into vertical columns of varying width that slide vertically past each
// other, parallax style, smeared into film grain — all fading in and gliding
// into register as the header scrolls to its anchor on screen. Position-driven,
// reversible.
export default function HeaderText({
  text,
  width,
  height,
  color = '#ffffff',
}: {
  text: string
  width: number
  height: number
  color?: string
}) {
  const mesh = useRef<THREE.Mesh>(null)
  const viewport = useThree((s) => s.viewport)
  const gl = useThree((s) => s.gl)
  const worldPos = useMemo(() => new THREE.Vector3(), [])

  // Breathing room around the text box so scattered slices, smears and echoes
  // drift past the type's bounds instead of clipping at the plane's edge.
  const pad = height
  const planeW = width + pad * 2
  const planeH = height + pad * 2

  const texture = useMemo(() => {
    // Scale the canvas up with the padding so glyph resolution doesn't drop.
    const cw = Math.min(2048, Math.round(1024 * (planeW / width)))
    const ch = Math.max(1, Math.round(cw * (planeH / planeW)))
    const canvas = document.createElement('canvas')
    canvas.width = cw
    canvas.height = ch
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, cw, ch)
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    let fontSize = ch * 0.62 * (height / planeH)
    const family = "900 {S}px 'Fraunces', Georgia, 'Times New Roman', serif"
    ctx.font = family.replace('{S}', String(fontSize))
    const maxW = cw * 0.94 * (width / planeW)
    const measured = ctx.measureText(text).width
    if (measured > maxW) {
      fontSize *= maxW / measured
      ctx.font = family.replace('{S}', String(fontSize))
    }
    ctx.fillText(text, cw / 2, ch / 2)

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.NoColorSpace
    tex.wrapS = THREE.ClampToEdgeWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.needsUpdate = true
    return tex
  }, [text, width, height, planeW, planeH])

  useEffect(() => () => texture.dispose(), [texture])

  const uniforms = useMemo(
    () => ({
      uText: { value: texture },
      uColor: { value: new THREE.Color(color) },
      uReveal: { value: 0 },
      uTravel: { value: headerTuning.travel },
      uColumns: { value: headerTuning.columns },
      uSmear: { value: headerTuning.smear },
      uGrain: { value: headerTuning.grain },
      uStagger: { value: headerTuning.stagger },
      uFadeIn: { value: headerTuning.fadeIn },
      uDpr: { value: 1 },
    }),
    [texture, color, planeW, planeH],
  )

  useFrame(() => {
    if (!mesh.current) return
    mesh.current.getWorldPosition(worldPos)

    // Position-driven reveal: 0 below the anchor band, ramping to 1 at the anchor
    // and staying there above it — so it clicks in on the way down, out on the way up.
    const H = viewport.height
    const anchor = H * headerTuning.anchor
    const dist = Math.max(0.001, H * headerTuning.reveal)
    uniforms.uReveal.value = THREE.MathUtils.clamp(
      (worldPos.y - (anchor - dist)) / dist,
      0,
      1,
    )

    // Live tuning. Travel/smear are authored as fractions of the text height,
    // so rescale them into padded-plane UV units; the column count likewise
    // counts across the text width, not the padded plane.
    const inner = height / planeH
    uniforms.uTravel.value = headerTuning.travel * inner
    uniforms.uSmear.value = headerTuning.smear * inner
    uniforms.uGrain.value = headerTuning.grain
    uniforms.uStagger.value = headerTuning.stagger
    uniforms.uFadeIn.value = headerTuning.fadeIn
    uniforms.uDpr.value = gl.getPixelRatio()
    uniforms.uColumns.value = Math.max(
      2,
      Math.round(headerTuning.columns * (planeW / width)),
    )
  })

  return (
    <mesh ref={mesh}>
      <planeGeometry args={[planeW, planeH, 1, 1]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  )
}
