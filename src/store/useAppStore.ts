import { create } from 'zustand'

type View = 'index' | 'gallery'

interface AppState {
  /** Which scene the persistent Canvas should render. */
  view: View
  activeSlug: string | null
  /** 0..1 scroll progress of the active gallery (driven by Lenis). */
  scroll: number
  /** Slug of the currently centered cover on the homepage carousel. */
  focusSlug: string | null
  /** React Router's navigate, stashed here so code inside the R3F Canvas
   *  (which is outside the Router's React context) can navigate too. */
  navigate: (path: string) => void

  setView: (view: View, slug?: string | null) => void
  setScroll: (scroll: number) => void
  setFocusSlug: (slug: string | null) => void
  setNavigate: (fn: (path: string) => void) => void
}

export const useAppStore = create<AppState>((set) => ({
  view: 'index',
  activeSlug: null,
  scroll: 0,
  focusSlug: null,
  navigate: () => {},

  setView: (view, slug = null) => set({ view, activeSlug: slug }),
  setScroll: (scroll) => set({ scroll }),
  setFocusSlug: (slug) => set({ focusSlug: slug }),
  setNavigate: (fn) => set({ navigate: fn }),
}))
