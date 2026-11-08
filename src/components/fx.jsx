import { useEffect, useRef, useState } from 'react'

export const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Pointer position over an element becomes --px/--py in the range -1..1 for the floating pieces. */
export function useParallax(ref) {
  useEffect(() => {
    const el = ref.current
    if (!el || reduced()) return
    const move = (e) => {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--px', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3))
      el.style.setProperty('--py', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3))
    }
    el.addEventListener('pointermove', move, { passive: true })
    return () => el.removeEventListener('pointermove', move)
  }, [ref])
}

/** Counts up once to `to`. */
export function Count({ to, ms = 1200, decimals = 0 }) {
  const target = Number(to) || 0
  const [n, setN] = useState(reduced() ? target : 0)
  useEffect(() => {
    if (reduced()) { setN(target); return }
    let raf
    const t0 = performance.now()
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / ms)
      setN(target * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return <>{decimals ? n.toFixed(decimals) : Math.round(n).toLocaleString()}</>
}

/** Marks elements with .rv as visible once, when they first scroll into view. Without JS everything stays visible. */
export function useReveal(dep) {
  useEffect(() => {
    if (reduced() || !('IntersectionObserver' in window)) return
    const root = document.documentElement
    root.classList.add('rv-on')
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target) }
    }, { threshold: 0.1 })
    document.querySelectorAll('.rv:not(.in)').forEach((n) => io.observe(n))
    return () => { io.disconnect() }
  }, [dep])
}

/** Decorative drifting colour behind a page header. */
export function Aurora() {
  return (
    <>
      <span className="blob blob--1" aria-hidden="true" />
      <span className="blob blob--2" aria-hidden="true" />
    </>
  )
}

const GLYPHS = ['{ }', '</>', '=>', 'PR', '#42', '✓', '( )', '&&', 'git', '[ ]', '//', '+1', 'merge', '0x'] 

/** Code symbols drifting up behind everything, fixed to the window. Purely decorative. */
export function Glyphs() {
  if (reduced()) return null
  return (
    <span className="glyphs" aria-hidden="true">
      {GLYPHS.map((g, i) => (
        <i key={i} style={{ '--x': `${(i * 71 + 7) % 96}%`, '--d': `${16 + ((i * 5) % 12)}s`, '--dl': `${-((i * 3.9) % 20)}s`, '--s': `${11 + (i % 4) * 2}px` }}>{g}</i>
      ))}
    </span>
  )
}

/** A thin bar at the top that fills as the page scrolls, and a class on <html> once the page has moved. */
export function ScrollProgress() {
  const ref = useRef(null)
  useEffect(() => {
    const root = document.documentElement
    let raf = 0
    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const max = root.scrollHeight - root.clientHeight
        ref.current?.style.setProperty('--sp', max > 0 ? Math.min(1, root.scrollTop / max).toFixed(4) : '0')
        root.classList.toggle('scrolled', root.scrollTop > 8)
      })
    }
    update()
    addEventListener('scroll', update, { passive: true })
    addEventListener('resize', update)
    return () => { cancelAnimationFrame(raf); removeEventListener('scroll', update); removeEventListener('resize', update) }
  }, [])
  return <div ref={ref} className="scroll-progress" aria-hidden="true" />
}

/** Confetti that flies out once when it mounts. */
export function Burst({ n = 24 }) {
  if (reduced() || !n) return null
  const colors = ['var(--aurora-1)', 'var(--aurora-2)', 'var(--aurora-3)', 'var(--aurora-4)', 'var(--accent)']
  return (
    <span className="burst" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + (i % 3) * 0.21
        const d = 70 + ((i * 37) % 80)
        return <i key={i} style={{ '--dx': `${(Math.cos(a) * d).toFixed(1)}px`, '--dy': `${(Math.sin(a) * d).toFixed(1)}px`, '--c': colors[i % colors.length], '--dl': `${650 + (i % 6) * 35}ms`, '--r': `${(i * 47) % 360}deg` }} />
      })}
    </span>
  )
}
