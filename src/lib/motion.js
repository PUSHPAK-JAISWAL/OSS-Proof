import { useEffect, useRef, useState } from 'react'

export const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** True once the element has scrolled into view. Starts true under reduced motion. */
export function useInView(options = { threshold: 0.25 }) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(prefersReduced())
  useEffect(() => {
    if (seen || !ref.current) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setSeen(true)
        io.disconnect()
      }
    }, options)
    io.observe(ref.current)
    return () => io.disconnect()
  }, [seen])
  return [ref, seen]
}

/** Counts from 0 to `to` once `start` is true. Rests on the final value under reduced motion. */
export function useCountUp(to, start, ms = 1100) {
  const [n, setN] = useState(prefersReduced() ? to : 0)
  useEffect(() => {
    if (!start || prefersReduced()) return setN(to)
    let raf
    const t0 = performance.now()
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / ms)
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, start, ms])
  return n
}

/** Scroll progress 0..1 of an element passing through the viewport. */
export function useScrollProgress() {
  const ref = useRef(null)
  const [p, setP] = useState(prefersReduced() ? 1 : 0)
  useEffect(() => {
    if (prefersReduced()) return
    let raf = 0
    const update = () => {
      raf = 0
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      setP(Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.9))))
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
      cancelAnimationFrame(raf)
    }
  }, [])
  return [ref, p]
}
