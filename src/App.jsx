import { useEffect } from 'react'
import Header from './components/Header'
import { Glyphs, ScrollProgress } from './components/fx'
import { prefersReduced } from './lib/motion'
import { useRoute } from './lib/router'
import Check from './pages/Check'
import Explore from './pages/Explore'
import Home from './pages/Home'
import Verify from './pages/Verify'

// Cards light up under the pointer (.spot and the card-like classes) and .tilt pieces lean toward it.
// This only writes a few CSS variables, and one listener serves the whole page.
const SPOT = '.spot, .card, .kpi, .step, .podium__c, .lb-row'
function useSpotlight() {
  useEffect(() => {
    if (prefersReduced()) return
    const onMove = (e) => {
      const spot = e.target.closest?.(SPOT)
      if (spot) {
        const r = spot.getBoundingClientRect()
        spot.style.setProperty('--mx', `${e.clientX - r.left}px`)
        spot.style.setProperty('--my', `${e.clientY - r.top}px`)
      }
      const tilt = e.target.closest?.('.tilt')
      if (tilt) {
        const r = tilt.getBoundingClientRect()
        const x = (e.clientX - r.left) / r.width - 0.5
        const y = (e.clientY - r.top) / r.height - 0.5
        tilt.style.setProperty('--rx', `${(-y * 16).toFixed(2)}deg`)
        tilt.style.setProperty('--ry', `${(x * 20).toFixed(2)}deg`)
      }
    }
    const onOut = (e) => {
      const tilt = e.target.closest?.('.tilt')
      if (tilt && !tilt.contains(e.relatedTarget)) { tilt.style.setProperty('--rx', '0deg'); tilt.style.setProperty('--ry', '0deg') }
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerout', onOut, { passive: true })
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerout', onOut) }
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
      <Glyphs />
      <ScrollProgress />
      <Header path={path} />
      <div key={section || 'home'} className="route-in">{page}</div>
    </>
  )
}
