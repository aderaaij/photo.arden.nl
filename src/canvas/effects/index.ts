import type { ComponentType } from 'react'
import type { CoverEffectProps } from './types'
import { DEFAULT_EFFECT_ID } from './constants'
import BendEffect from './BendEffect'
import DescrambleEffect from './DescrambleEffect'
import ParticlesEffect from './ParticlesEffect'

export interface EffectDef {
  id: string
  name: string
  description: string
  Component: ComponentType<CoverEffectProps>
}

// The list of cover effects, in switcher order. Add a new iteration by writing
// a component with the CoverEffectProps signature and registering it here — the
// switcher and number-key shortcuts pick it up automatically.
export const EFFECTS: EffectDef[] = [
  {
    id: 'bend',
    name: 'Bend & Drift',
    description: 'Velocity bend + chromatic aberration — the original scroll feel.',
    Component: BendEffect,
  },
  {
    id: 'descramble',
    name: 'Pixel Snap',
    description: 'Blocks scatter and snap into place as it centers.',
    Component: DescrambleEffect,
  },
  {
    id: 'particles',
    name: 'Particle Assemble',
    description: 'Pixels fly in and assemble into the photo.',
    Component: ParticlesEffect,
  },
]

export function getEffect(id: string): EffectDef {
  return (
    EFFECTS.find((e) => e.id === id) ??
    EFFECTS.find((e) => e.id === DEFAULT_EFFECT_ID) ??
    EFFECTS[0]
  )
}

export { DEFAULT_EFFECT_ID }
