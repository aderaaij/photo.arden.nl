import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import vertexShader from '../shaders/header.vert'
import fragmentShader from '../shaders/header.frag'
import { headerTuning } from '../lib/headerTuning'

// A section header: the label rendered to a canvas texture, mapped onto a plane,
// sliced into chunky blocks that each click into place (with a grain dissolve) as
// the header scrolls to its anchor on screen — position-driven, reversible.
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
  const worldPos = useMemo(() => new THREE.Vector3(), [])

  const texture = useMemo(() => {
    const PX = 1024
    const cw = PX
    const ch = Math.max(1, Math.round(PX * (height / width)))
    const canvas = document.createElement('canvas')
    canvas.width = cw
    canvas.height = ch
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, cw, ch)
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    let fontSize = ch * 0.62
    const family = "900 {S}px 'Fraunces', Georgia, 'Times New Roman', serif"
    ctx.font = family.replace('{S}', String(fontSize))
    const maxW = cw * 0.94
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
  }, [text, width, height])

  useEffect(() => () => texture.dispose(), [texture])

  const uniforms = useMemo(
    () => ({
      uText: { value: texture },
      uColor: { value: new THREE.Color(color) },
      uReveal: { value: 0 },
      uTravel: { value: headerTuning.travel },
      uBlocks: { value: new THREE.Vector2(6, 6) },
      uFade: { value: headerTuning.grain },
      uPixel: { value: new THREE.Vector2(220, 64) },
      uStagger: { value: headerTuning.stagger },
      uDot: { value: headerTuning.dot },
    }),
    [texture, color],
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

    // Live tuning.
    uniforms.uTravel.value = headerTuning.travel
    uniforms.uFade.value = headerTuning.grain
    uniforms.uStagger.value = headerTuning.stagger
    uniforms.uDot.value = headerTuning.dot
    const rows = headerTuning.rows
    uniforms.uBlocks.value.set(Math.max(2, Math.round(rows * (width / height))), rows)
    const px = headerTuning.fine
    uniforms.uPixel.value.set(px, Math.max(2, Math.round(px * (height / width))))
  })

  return (
    <mesh ref={mesh}>
      <planeGeometry args={[width, height, 1, 1]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  )
}
