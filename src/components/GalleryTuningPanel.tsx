import { useControls, folder } from 'leva'
import { headerTuning } from '../lib/headerTuning'

// Live controls for the section-header slice/grain reveal. Values are pushed into
// the `headerTuning` singleton, read each frame by HeaderText. Dev-only.
export default function GalleryTuningPanel() {
  const v = useControls({
    'Header reveal': folder({
      travel: { value: headerTuning.travel, min: 0, max: 1.5, step: 0.02 },
      smear: { value: headerTuning.smear, min: 0, max: 1, step: 0.02 },
      grain: { value: headerTuning.grain, min: 0, max: 1, step: 0.05 },
      columns: { value: headerTuning.columns, min: 2, max: 48, step: 1 },
      stagger: { value: headerTuning.stagger, min: 0, max: 0.95, step: 0.05 },
      fadeIn: { value: headerTuning.fadeIn, min: 0.05, max: 1, step: 0.05 },
      reveal: { value: headerTuning.reveal, min: 0.1, max: 1, step: 0.05 },
      anchor: { value: headerTuning.anchor, min: -0.3, max: 0.4, step: 0.02 },
    }),
  })

  headerTuning.travel = v.travel
  headerTuning.smear = v.smear
  headerTuning.grain = v.grain
  headerTuning.columns = v.columns
  headerTuning.stagger = v.stagger
  headerTuning.fadeIn = v.fadeIn
  headerTuning.reveal = v.reveal
  headerTuning.anchor = v.anchor

  return null
}
