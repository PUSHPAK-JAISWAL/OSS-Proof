import { useEffect, useRef } from 'react'
import dg from '../vendor/diagrams/diagram.js'
import '../vendor/diagrams/diagram.css'

// The skill's own diagram component (assets/diagrams), mounted from a spec. Its light runs along the
// lines in a 2.5 to 4 second loop and rests under reduced motion.
export default function Diagram({ spec, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    const d = dg.mount(ref.current, spec)
    return () => d?.destroy?.()
  }, [spec])
  return <div ref={ref} className={`dg ${className}`} role="img" aria-label={spec.alt} />
}
