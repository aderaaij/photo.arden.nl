// Every cover effect is a component with this signature, so they're hot-swappable.
export interface CoverEffectProps {
  url: string
  index: number
  count: number
  spacing: number
  baseWidth?: number
  onClick?: () => void
}

// What the shared per-frame hook hands each effect.
export interface CoverFrameState {
  /** wrapped world x-position of this cover */
  wrapped: number
  /** 0 = at the edge, 1 = dead center */
  focus: number
  /** signed normalized distance from center (-1..1) */
  shift: number
  /** clamped scroll velocity */
  velocity: number
}
