import { create } from 'zustand'
import { DEFAULT_EFFECT_ID } from '../canvas/effects/constants'

type View = 'index' | 'gallery'

// Initial cover effect: ?fx= query param wins, then the last localStorage choice,
// then the default. Lets us deep-link a specific iteration.
function initialEffect(): string {
  if (typeof window === 'undefined') return DEFAULT_EFFECT_ID
  const fromUrl = new URLSearchParams(window.location.search).get('fx')
  if (fromUrl) return fromUrl
  return window.localStorage.getItem('coverEffect') || DEFAULT_EFFECT_ID
}

interface AppState {
  /** Which scene the persistent Canvas should render. */
  view: View
  activeSlug: string | null
  /** 0..1 scroll progress of the active gallery (driven by Lenis). */
  scroll: number
  /** Slug of the currently centered cover on the homepage carousel. */
  focusSlug: string | null
  /** Active cover effect id (see canvas/effects). Persisted to localStorage. */
  effectId: string
  /** React Router's navigate, stashed here so code inside the R3F Canvas
   *  (which is outside the Router's React context) can navigate too. */
  navigate: (path: string) => void

  setView: (view: View, slug?: string | null) => void
  setScroll: (scroll: number) => void
  setFocusSlug: (slug: string | null) => void
  setEffectId: (id: string) => void
  setNavigate: (fn: (path: string) => void) => void
}

export const useAppStore = create<AppState>((set) => ({
  view: 'index',
  activeSlug: null,
  scroll: 0,
  focusSlug: null,
  effectId: initialEffect(),
  navigate: () => {},

  setView: (view, slug = null) => set({ view, activeSlug: slug }),
  setScroll: (scroll) => set({ scroll }),
  setFocusSlug: (slug) => set({ focusSlug: slug }),
  setEffectId: (id) => {
    if (typeof window !== 'undefined') window.localStorage.setItem('coverEffect', id)
    set({ effectId: id })
  },
  setNavigate: (fn) => set({ navigate: fn }),
}))
