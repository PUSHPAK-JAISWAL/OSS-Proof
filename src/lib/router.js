import { useEffect, useState } from 'react'

// Hash routing keeps every URL working on GitHub Pages, which has no server-side fallback.
function read() {
  const raw = (location.hash || '#/').slice(1)
  const [path, query = ''] = raw.split('?')
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent)
  return { parts, path: '/' + parts.join('/'), query: new URLSearchParams(query) }
}

export function useRoute() {
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const on = () => {
      setRoute(read())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export const go = (path) => {
  location.hash = path.startsWith('/') ? path : `/${path}`
}

export function scrollToId(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
}
