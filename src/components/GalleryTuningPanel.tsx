import { useControls, folder } from 'leva'
import { headerTuning } from '../lib/headerTuning'

// Live controls for the section-header slice/grain reveal. Values are pushed into
// the `headerTuning` singleton, read each frame by HeaderText. Dev-only.
export default function GalleryTuningPanel() {
  const v = useControls({
    'Header reveal': folder({
      travel: { value: headerTuning.travel, min: 0, max: 1.5, step: 0.02 },
      grain: { value: headerTuning.grain, min: 0, max: 3, step: 0.05 },
      fine: { value: headerTuning.fine, min: 40, max: 600, step: 10 },
      dot: { value: headerTuning.dot, min: 0.1, max: 0.5, step: 0.02 },
      rows: { value: headerTuning.rows, min: 1, max: 24, step: 1 },
      stagger: { value: headerTuning.stagger, min: 0, max: 0.95, step: 0.05 },
      reveal: { value: headerTuning.reveal, min: 0.1, max: 1, step: 0.05 },
      anchor: { value: headerTuning.anchor, min: -0.3, max: 0.4, step: 0.02 },
    }),
  })

  headerTuning.travel = v.travel
  headerTuning.grain = v.grain
  headerTuning.fine = v.fine
  headerTuning.dot = v.dot
  headerTuning.rows = v.rows
  headerTuning.stagger = v.stagger
  headerTuning.reveal = v.reveal
  headerTuning.anchor = v.anchor

  return null
}
