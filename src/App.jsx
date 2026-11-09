import { useEffect } from 'react'
import Header from './components/Header'
import { prefersReduced } from './lib/motion'
import { useRoute } from './lib/router'
import Check from './pages/Check'
import Explore from './pages/Explore'
import Home from './pages/Home'
import Verify from './pages/Verify'

// Page-wide pointer and scroll effects. They only write CSS variables, so React does not re-render.
function useAmbient() {
  useEffect(() => {
    if (prefersReduced()) return
    const root = document.documentElement
    let raf = 0
    const onMove = (e) => {
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0
          root.style.setProperty('--gx', `${e.clientX}px`)
          root.style.setProperty('--gy', `${e.clientY}px`)
        })
      }
      const spot = e.target.closest?.('.spot')
      if (spot) {
        const r = spot.getBoundingClientRect()
        spot.style.setProperty('--mx', `${e.clientX - r.left}px`)
        spot.style.setProperty('--my', `${e.clientY - r.top}px`)
      }
    }
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      root.style.setProperty('--p', max > 0 ? String(Math.min(1, window.scrollY / max)) : '0')
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])
}

export default function App() {
  const { parts, path } = useRoute()
  const [section, arg] = parts
  useAmbient()

  let page
  if (section === 'check') page = <Check username={arg} />
  else if (section === 'verify' && arg) page = <Verify login={arg} />
  else if (section === 'explore') page = <Explore />
  else page = <Home />

  return (
    <>
      <div className="progress" aria-hidden="true" />
      <div className="cursor-glow" aria-hidden="true" />
      <Header path={path} />
      {page}
    </>
  )
}
