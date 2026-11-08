import { useEffect, useMemo, useRef, useState } from 'react'
import { reduced } from './fx'

/** Loads three.js only when a scene is actually shown, and quietly shows a still picture where WebGL is unavailable or motion is reduced. */
function GL({ load, props, className = '', children }) {
  const host = useRef(null)
  const [ok, setOk] = useState(true)
  useEffect(() => {
    if (reduced()) { setOk(false); return }
    let dead = false
    let dispose = null
    Promise.all([load(), import('./three/engine.js')])
      .then(([scene, engine]) => {
        if (dead || !host.current) return
        dispose = engine.mountScene(host.current, (ctx) => scene.default(ctx, props))
        if (!dispose) setOk(false)
      })
      .catch(() => setOk(false))
    return () => { dead = true; dispose?.() }
  }, [load, props])
  return (
    <div ref={host} className={`gl-host ${ok ? '' : 'gl-off'} ${className}`} aria-hidden="true">
      {children}
    </div>
  )
}

const loadCore = () => import('./three/core.js')
const loadUniverse = () => import('./three/universe.js')
const NONE = {}

export function HeroCore({ className }) {
  return <GL load={loadCore} props={NONE} className={className} />
}

export function Universe({ repos, languages, grade }) {
  const [tip, setTip] = useState(null)
  const colors = useMemo(() => Object.fromEntries((languages || []).filter((l) => l.color).map((l) => [l.name, l.color])), [languages])
  const props = useMemo(() => ({ repos, colors, grade, onHover: (r, x, y) => setTip(r ? { r, x, y } : null) }), [repos, colors, grade])
  return (
    <div className="universe">
      <GL load={loadUniverse} props={props} className="universe__gl" />
      {tip && (
        <div className="universe__tip" style={{ left: Math.min(tip.x + 14, 9999), top: tip.y - 10 }} role="status">
          <b>{tip.r.repo}</b>
          <span>{tip.r.prs} merged {tip.r.prs === 1 ? 'PR' : 'PRs'}{tip.r.stars ? ` · ★ ${tip.r.stars.toLocaleString()}` : ''}{tip.r.language ? ` · ${tip.r.language}` : ''}</span>
        </div>
      )}
    </div>
  )
}
