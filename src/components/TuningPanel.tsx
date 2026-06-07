import { useControls, folder } from 'leva'
import { tuning } from '../lib/tuning'
import { infiniteScroll } from '../lib/scrollController'

// Live controls for the carousel. Values are pushed into the `tuning` singleton
// and the scroll controller, which the render loop reads each frame — so there
// are no React re-renders driving the canvas. Dev-only (see IndexPage).
export default function TuningPanel() {
  const v = useControls({
    Scroll: folder({
      ease: { value: 0.09, min: 0.02, max: 0.25, step: 0.005 },
      wheel: { value: 0.0024, min: 0.0005, max: 0.012, step: 0.0001 },
      drag: { value: 0.0065, min: 0.002, max: 0.02, step: 0.0005 },
      snap: { value: 0.1, min: 0, max: 0.3, step: 0.01 },
    }),
    Bend: folder({
      billow: { value: tuning.billow, min: 0, max: 5, step: 0.1 },
      bow: { value: tuning.bow, min: 0, max: 6, step: 0.1 },
    }),
    Image: folder({
      aberration: { value: tuning.aberration, min: 0, max: 2, step: 0.05 },
      dim: { value: tuning.dim, min: 0, max: 1, step: 0.05 },
    }),
    'Pixel Snap': folder(
      {
        blocks: { value: tuning.blocks, min: 4, max: 60, step: 1 },
        steps: { value: tuning.steps, min: 1, max: 12, step: 1 },
        displace: { value: tuning.snapDisplace, min: 0, max: 0.3, step: 0.005 },
      },
      { collapsed: true },
    ),
    Particles: folder(
      {
        flyDist: { value: tuning.flyDist, min: 0, max: 2, step: 0.05 },
        flyVel: { value: tuning.flyVel, min: 0, max: 4, step: 0.1 },
      },
      { collapsed: true },
    ),
  })

  // Push live values into the singletons read by the render loop.
  tuning.billow = v.billow
  tuning.bow = v.bow
  tuning.aberration = v.aberration
  tuning.dim = v.dim
  tuning.blocks = v.blocks
  tuning.steps = v.steps
  tuning.snapDisplace = v.displace
  tuning.flyDist = v.flyDist
  tuning.flyVel = v.flyVel

  infiniteScroll.ease = v.ease
  infiniteScroll.wheelFactor = v.wheel
  infiniteScroll.dragFactor = v.drag
  infiniteScroll.snapStrength = v.snap

  return null
}
