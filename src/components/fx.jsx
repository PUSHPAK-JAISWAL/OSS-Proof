import { useEffect, useState } from 'react'

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
