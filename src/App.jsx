import { useEffect } from 'react'
import Header from './components/Header'
import { prefersReduced } from './lib/motion'
import { useRoute } from './lib/router'
import Check from './pages/Check'
import Explore from './pages/Explore'
import Home from './pages/Home'
import Verify from './pages/Verify'

// A card with the .spot class lights up under the pointer. This only writes two CSS variables.
function useSpotlight() {
  useEffect(() => {
    if (prefersReduced()) return
    const onMove = (e) => {
      const spot = e.target.closest?.('.spot')
      if (!spot) return
      const r = spot.getBoundingClientRect()
      spot.style.setProperty('--mx', `${e.clientX - r.left}px`)
      spot.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])
}

export default function App() {
  const { parts, path } = useRoute()
  const [section, arg] = parts
  useSpotlight()

  let page
  if (section === 'check') page = <Check username={arg} />
  else if (section === 'verify' && arg) page = <Verify login={arg} />
  else if (section === 'explore') page = <Explore />
  else page = <Home />

  return (
    <>
      <Header path={path} />
      {page}
    </>
  )
}
