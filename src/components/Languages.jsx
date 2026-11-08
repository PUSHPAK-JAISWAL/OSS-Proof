import { useState } from 'react'

const FALLBACK = ['#58a6ff', '#f78166', '#56d364', '#d2a8ff', '#e3b341', '#79c0ff', '#ff7b72', '#7ee787', '#ffa657', '#a5d6ff']

/** Every language, as a ring that sweeps in plus a list with shares. Older certificates only carry names and weights, so it copes with that. */
export default function Languages({ languages }) {
  const [hot, setHot] = useState(null)
  const list = (languages || []).map((l, i) => ({ ...l, color: l.color || FALLBACK[i % FALLBACK.length], v: l.share ?? l.weight ?? 0 }))
  if (!list.length) return null
  const total = list.reduce((t, l) => t + l.v, 0) || 1
  let at = 0
  const stops = list.map((l, i) => {
    const a = at
    at += (l.v / total) * 100
    return `${hot === null || hot === i ? l.color : `color-mix(in oklab, ${l.color} 28%, transparent)`} ${a.toFixed(2)}% ${at.toFixed(2)}%`
  }).join(', ')
  const max = Math.max(...list.map((l) => l.v)) || 1

  return (
    <div className="lang">
      <div className="lang__wrap">
        <div className="lang__ring" style={{ background: `conic-gradient(${stops})` }} />
        <div className="lang__centre">
          <b>{list.length}</b>
          <small>{list.length === 1 ? 'language' : 'languages'}</small>
        </div>
      </div>
      <ul className="lang__list" onMouseLeave={() => setHot(null)}>
        {list.map((l, i) => (
          <li key={l.name} className={hot === i ? 'is-hot' : ''} style={{ '--i': i, '--c': l.color }} onMouseEnter={() => setHot(i)} onFocus={() => setHot(i)} tabIndex={0}>
            <i className="lang__dot" />
            <span className="lang__name">{l.name}</span>
            <span className="lang__bar"><b style={{ width: `${Math.max(3, (l.v / max) * 100)}%` }} /></span>
            <span className="lang__pct mono">{l.share != null ? `${l.share.toFixed(1)}%` : ''}</span>
            <span className="lang__meta">
              {[l.repos ? `${l.repos} ${l.repos === 1 ? 'project' : 'projects'}` : null, l.own ? `${l.own} own ${l.own === 1 ? 'repo' : 'repos'}` : null].filter(Boolean).join(' · ')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
