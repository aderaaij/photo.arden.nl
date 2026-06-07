import { Outlet } from 'react-router-dom'
import SceneCanvas from '../canvas/SceneCanvas'
import Transition from './Transition'
import { useLenis } from '../hooks/useLenis'

export default function Layout() {
  useLenis()

  return (
    <>
      {/* Persistent WebGL layer — never unmounts, so transitions can span routes. */}
      <SceneCanvas />

      {/* DOM overlay (text, nav, accessible content). */}
      <main className="overlay">
        <Outlet />
      </main>

      {/* Placeholder route-change curtain — the real WebGL transition goes here. */}
      <Transition />
    </>
  )
}
