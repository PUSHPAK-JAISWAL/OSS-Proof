import { useEffect, useMemo, useState } from 'react'
import { Btn, fmtDate } from '../components/ui'
import { fetchIndex } from '../lib/verify'

const ACTIVITY = [
  ['any', 'Any time'],
  ['30', 'Last 30 days'],
  ['90', 'Last 90 days'],
  ['365', 'Last year'],
]
const GRADE_ORDER = ['S', 'A', 'B', 'C', 'D', '-']

function Select({ label, value, onChange, options }) {
  return (
    <label className="grid gap-1.5 min-w-0">
      <span className="label">{label}</span>
      <select className="input pr-8" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  )
}

export default function Explore() {
  const [state, setState] = useState({ phase: 'loading', entries: [] })
  const [q, setQ] = useState('')
  const [country, setCountry] = useState('all')
  const [language, setLanguage] = useState('all')
  const [activity, setActivity] = useState('any')
  const [grade, setGrade] = useState('all')

  useEffect(() => {
    let live = true
    fetchIndex()
      .then((idx) => live && setState({ phase: 'done', entries: idx?.entries || [], updatedAt: idx?.updatedAt }))
      .catch((err) => live && setState({ phase: 'error', message: err.message, entries: [] }))
    return () => { live = false }
  }, [])

  const countries = useMemo(() => [...new Set(state.entries.map((e) => e.country).filter(Boolean))].sort(), [state.entries])
  const languages = useMemo(() => [...new Set(state.entries.flatMap((e) => e.languages))].sort(), [state.entries])

  const rows = useMemo(() => {
    const now = Date.now()
    return state.entries.filter((e) => {
      if (q && !e.login.toLowerCase().includes(q.toLowerCase().trim()) && !(e.name || '').toLowerCase().includes(q.toLowerCase().trim())) return false
      if (country !== 'all' && e.country !== country) return false
      if (language !== 'all' && !e.languages.includes(language)) return false
      if (grade !== 'all' && GRADE_ORDER.indexOf(e.grade) > GRADE_ORDER.indexOf(grade)) return false
      if (activity !== 'any') {
        if (!e.lastMergedAt) return false
        if ((now - Date.parse(e.lastMergedAt)) / 864e5 > Number(activity)) return false
      }
      return true
    })
  }, [state.entries, q, country, language, activity, grade])

  return (
    <main className="page">
      <div className="wrap grid gap-10">
        <div>
          <h1 className="h2 m-0">Developers with certificates</h1>
          <p className="lead mt-4 mb-0 muted">Filter by country, language, recent activity and grade. Open any row to check its signature.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <label className="grid gap-1.5 col-span-2 lg:col-span-1">
            <span className="label">Search</span>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Username or name" />
          </label>
          <Select label="Country (self-declared)" value={country} onChange={setCountry} options={[['all', 'All countries'], ...countries.map((c) => [c, c])]} />
          <Select label="Language" value={language} onChange={setLanguage} options={[['all', 'All languages'], ...languages.map((l) => [l, l])]} />
          <Select label="Last merged PR" value={activity} onChange={setActivity} options={ACTIVITY} />
          <Select label="Grade" value={grade} onChange={setGrade} options={[['all', 'Any grade'], ['S', 'S only'], ['A', 'A and above'], ['B', 'B and above'], ['C', 'C and above']]} />
        </div>

        {state.phase === 'loading' && <p className="muted" role="status">Loading…</p>}
        {state.phase === 'error' && <div className="card p-6" role="alert"><p className="m-0 muted">{state.message}</p></div>}

        {state.phase === 'done' && state.entries.length === 0 && (
          <div className="card p-8 grid gap-4 justify-items-start">
            <h2 className="h3 m-0">No certificates yet</h2>
            <p className="m-0 muted max-w-[52ch]">Be the first. Check your profile, then request a signed certificate.</p>
            <Btn href="#/check">Get a certificate</Btn>
          </div>
        )}

        {state.phase === 'done' && state.entries.length > 0 && (
          <div>
            <p className="label mb-3" aria-live="polite">{rows.length} of {state.entries.length} developers</p>
            {rows.length === 0 ? (
              <div className="card p-8"><p className="m-0 muted">No one matches those filters. Try widening them.</p></div>
            ) : (
              <ul className="m-0 p-0 list-none border border-line rounded-lg divide-y divide-line">
                {rows.map((e) => (
                  <li key={e.login}>
                    <a href={`#/verify/${e.login}`} className="grid grid-cols-[48px_1fr_auto] sm:grid-cols-[48px_1.2fr_1fr_1fr_auto] items-center gap-4 px-4 py-3 hover:bg-surface transition-colors">
                      <img src={e.avatarUrl} alt="" width="40" height="40" className="rounded-sm border border-line" loading="lazy" />
                      <span className="min-w-0">
                        <span className="block font-medium truncate">{e.name || e.login}</span>
                        <span className="block label truncate">@{e.login}{e.country ? ` · ${e.country}` : ''}</span>
                      </span>
                      <span className="hidden sm:block text-[15px] truncate">{e.languages.join(', ') || '—'}</span>
                      <span className="hidden sm:block label">Last merged {fmtDate(e.lastMergedAt)}</span>
                      <span className="flex items-baseline gap-3 justify-end">
                        <span className="mono text-sm">{e.score.toFixed(1)}</span>
                        <span className="text-[28px] leading-none tracking-tighter w-8 text-center">{e.grade === '-' ? '–' : e.grade}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
