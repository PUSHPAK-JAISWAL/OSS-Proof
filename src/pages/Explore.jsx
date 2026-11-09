import { useEffect, useMemo, useState } from 'react'
import { Badge, Btn, fmtDate } from '../components/ui'
import { Aurora, useReveal } from '../components/fx'
import { fetchIndex } from '../lib/verify'
import { go } from '../lib/router'

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

  useReveal(`${state.phase}|${rows.length}|${q}|${country}|${language}|${activity}|${grade}`)

  return (
    <main className="page page-ground">
      <Aurora />
      <div className="wrap grid gap-10">
        <div>
          <p className="kicker mb-4">03 / developers</p>
          <h1 className="h2 m-0">Developers with certificates</h1>
          <p className="lead mt-4 mb-0 muted">Filter by country, language, recent activity and grade. Open any row to check its signature.</p>
        </div>

        <form
          className="card p-5 flex flex-wrap items-end gap-3 rv"
          onSubmit={(e) => {
            e.preventDefault()
            const u = new FormData(e.currentTarget).get('login')?.toString().trim().replace(/^@/, '')
            if (u) go(`/check/${u}`)
          }}
        >
          <label className="grid gap-1.5 flex-1 min-w-[220px]">
            <span className="font-medium">Check any GitHub profile</span>
            <input name="login" className="input" placeholder="octocat" autoComplete="off" spellCheck="false" />
          </label>
          <Btn type="submit">Check</Btn>
          <p className="label m-0 basis-full">Works for anyone, with or without a certificate. It reads their public pull requests live.</p>
        </form>

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

        {state.phase === 'loading' && (
          <div className="grid gap-3" role="status" aria-label="Loading developers">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skel h-[66px]" style={{ opacity: 1 - i * 0.15 }} />)}
          </div>
        )}
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
              <div className="grid gap-8">
                {rows.length >= 3 && (
                  <div className="podium">
                    {rows.slice(0, 3).map((e, i) => (
                      <a key={e.login} href={`#/verify/${e.login}`} className={`podium__c podium__c--${i + 1} rv`} style={{ '--i': i }}>
                        {i === 0 && <svg className="crown" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M3 19h18l-1.6-10.5-4.7 4.2L12 5.5 9.3 12.7 4.6 8.5z" /></svg>}
                        <span className="rank">#{i + 1}</span>
                        <div className="float" style={{ '--d': `${6 + i}s`, '--dl': `${-i * 1.3}s`, '--amp': '6px' }}>
                          <div className="tilt"><Badge grade={e.grade} score={e.score} login={e.login} projects={e.projects} height={78} /></div>
                        </div>
                        <span className="min-w-0 w-full"><span className="block font-medium truncate">{e.name || e.login}</span><span className="block label truncate">@{e.login}{e.country ? ` · ${e.country}` : ''}</span></span>
                      </a>
                    ))}
                  </div>
                )}
                <ul className="m-0 p-0 list-none border border-line rounded-xl divide-y divide-line overflow-hidden">
                  {rows.map((e, i) => (
                    <li key={e.login} className="rv" style={{ '--i': Math.min(i, 10) }}>
                      <a href={`#/verify/${e.login}`} className="lb-row grid-cols-[28px_40px_1fr_auto] sm:grid-cols-[28px_40px_1.2fr_1fr_1fr_auto]">
                        <span className="rank">{i + 1}</span>
                        <img src={e.avatarUrl} alt="" width="40" height="40" className="rounded-md border border-line" loading="lazy" />
                        <span className="min-w-0">
                          <span className="block font-medium truncate">{e.name || e.login}</span>
                          <span className="block label truncate">@{e.login}{e.country ? ` · ${e.country}` : ''}</span>
                        </span>
                        <span className="hidden sm:flex items-center gap-1.5 min-w-0 text-[15px]">
                          {e.languages.slice(0, 3).map((l) => <span key={l} className="lchip lchip--sm"><i />{l}</span>)}
                          {e.languages.length > 3 && <span className="label">+{e.languages.length - 3}</span>}
                          {!e.languages.length && '—'}
                        </span>
                        <span className="hidden sm:block label">{e.projects ? `${e.projects} ${e.projects === 1 ? 'project' : 'projects'} · ` : ''}Last merged {fmtDate(e.lastMergedAt)}</span>
                        <span className="flex items-baseline gap-3 justify-end">
                          <span className="mono text-sm">{e.score.toFixed(1)}</span>
                          <span className="text-[28px] leading-none tracking-tighter w-8 text-center">{e.grade === '-' ? '–' : e.grade}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
