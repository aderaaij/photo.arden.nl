import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import SceneManager from './SceneManager'

// SCAFFOLD color note: we disable three's automatic color management so our
// custom reveal shader can pass texture bytes straight through and display
// correctly with zero risk. Before launch this becomes a proper linear
// workflow (decode sRGB -> work in linear -> encode out) — color fidelity is
// the one thing we promised to get right for the photography.
THREE.ColorManagement.enabled = false

export default function SceneCanvas() {
  return (
    <Canvas
      className="scene-canvas"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
      camera={{ position: [0, 0, 6], fov: 45 }}
    >
      <SceneManager />
    </Canvas>
  )
}
