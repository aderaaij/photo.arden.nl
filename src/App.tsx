import { useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { useAppStore } from './store/useAppStore'
import Layout from './components/Layout'
import IndexPage from './routes/IndexPage'
import GalleryPage from './routes/GalleryPage'

export default function App() {
  const navigate = useNavigate()
  const setNavigate = useAppStore((s) => s.setNavigate)

  // Bridge Router's navigate into the store so 3D objects can trigger routing.
  useEffect(() => {
    setNavigate((path: string) => navigate(path))
  }, [navigate, setNavigate])

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<IndexPage />} />
        <Route path="/g/:slug" element={<GalleryPage />} />
      </Route>
    </Routes>
  )
}
