import { useRef } from 'react'
import { Badge, Breakdown, fmtDate, fmtStars, Icon } from './ui'
import { Burst, Count, useParallax, useReveal } from './fx'
import Languages from './Languages'
import { EvidenceList, RepoList, Timeline } from './cert'

const num = (n) => (n == null ? '—' : Number(n).toLocaleString())

function Kpi({ label, value, hint, i = 0 }) {
  return (
    <div className="kpi rv" style={{ '--i': i }}>
      <span className="kpi__v">{value}</span>
      <span className="kpi__l">{label}</span>
      {hint && <span className="kpi__h">{hint}</span>}
    </div>
  )
}

/**
 * One view of a graded profile, used by both the live check and the certificate page.
 * `p` is the shared result shape; everything newer than scoring 1.2 is optional so older certificates still render.
 */
export default function Report({ p, theme = 'grade', notices = null, children }) {
  const ref = useRef(null)
  useParallax(ref)
  useReveal(p.login + p.issuedAt)
  const c = p.counts
  const st = p.stats
  const a = p.activity
  const projects = c.foundProjects || c.repos

  return (
    <div ref={ref} className="grid gap-10 min-w-0">
      <section className="report-hero glowframe-soft">
        <span className="blob blob--1" aria-hidden="true" /><span className="blob blob--3" aria-hidden="true" />
        <div className="report-hero__in">
          <div className="flex items-center gap-4 min-w-0">
            <img src={p.avatarUrl} alt="" width="72" height="72" className="rounded-lg border border-line shrink-0" />
            <div className="min-w-0">
              <h1 className="m-0 text-[26px] sm:text-[30px] tracking-tight leading-tight truncate">{p.name || p.login}</h1>
              <a className="link label" href={p.profileUrl} target="_blank" rel="noreferrer noopener">@{p.login}</a>
              <p className="m-0 mt-1 label truncate">{[p.profile?.company, p.location, p.country && !p.location?.includes(p.country) ? p.country : null].filter(Boolean).join(' · ') || ' '}</p>
            </div>
          </div>
          <div className="report-score">
            <span className="report-score__n"><Count to={p.score} decimals={1} /></span>
            <span className="report-score__u">/ 100 · {p.gradeLabel}</span>
          </div>
          <div className="par report-badge" style={{ '--z': 14 }}>
            <div className="float" style={{ '--d': '7s', '--amp': '9px' }}>
              <div className="stamp relative">
                <div className="tilt"><Badge grade={p.grade} score={p.score} login={p.login} projects={c.repos} theme={theme} height={104} /></div>
                <Burst n={{ S: 30, A: 24, B: 18, C: 12 }[p.grade] || 0} />
              </div>
            </div>
          </div>
        </div>
        {p.profile?.bio && <p className="m-0 mt-5 muted max-w-[70ch] relative">{p.profile.bio}</p>}
        {p.languages?.length > 0 && (
          <div className="lchips" aria-label="Languages">
            {p.languages.slice(0, 8).map((l, i) => <span key={l.name} className="lchip" style={{ '--c': l.color || 'var(--accent)', '--i': i }}><i />{l.name}</span>)}
            {p.languages.length > 8 && <span className="lchip lchip--more">+{p.languages.length - 8}</span>}
          </div>
        )}
      </section>

      {notices}

      {p.mode === 'deep' && c.mergedFound > 0 && c.counted < c.mergedFound * 0.5 && (
        <section className="card p-5 grid gap-3 rv" role="note">
          <h2 className="h3 m-0">Why {c.counted} of {num(c.mergedFound)} merged pull requests count</h2>
          <p className="m-0 muted text-[15px] max-w-[72ch]">Only work that someone else accepted into a project counts. That is what makes the grade hard to inflate, and it is the same rule for everyone.</p>
          <ul className="m-0 p-0 list-none grid gap-1.5 text-[15px]">
            <li><b className="mono">{num(c.counted)}</b> counted</li>
            {c.selfMerged > 0 && <li><b className="mono">{num(c.selfMerged)}</b> were merged by {p.login} themself, so they are not outside review</li>}
            {c.unverifiable > 0 && <li><b className="mono">{num(c.unverifiable)}</b> have no recorded merger on GitHub</li>}
            {c.mergedFound - c.counted - c.selfMerged - c.unverifiable > 0 && <li><b className="mono">{num(c.mergedFound - c.counted - c.selfMerged - c.unverifiable)}</b> are in repositories {p.login} owns, or where GitHub gives no outside role</li>}
          </ul>
        </section>
      )}

      <div className="kpis">
        <Kpi i={0} value={<Count to={projects} />} label="open source projects" hint={projects > c.repos ? `${c.repos} checked` : null} />
        <Kpi i={1} value={<Count to={c.counted} />} label="merged PRs counted" hint={c.selfMerged ? `${c.selfMerged} self-merged, not counted` : null} />
        <Kpi i={2} value={st?.maintainers != null ? <Count to={st.maintainers} /> : '—'} label="maintainers merged your work" />
        <Kpi i={3} value={st?.medianDaysToMerge != null ? `${st.medianDaysToMerge}d` : '—'} label="median time to merge" />
        <Kpi i={4} value={st ? <>+{num(st.additions)}<span className="kpi__sub"> −{num(st.deletions)}</span></> : '—'} label="lines changed" hint={st?.filesChanged ? `${num(st.filesChanged)} files` : null} />
        <Kpi i={5} value={<Count to={c.activeMonths24} />} label="active months of 24" />
      </div>

      {p.languages?.length > 0 && (
        <section className="card p-6 grid gap-5 rv">
          <div>
            <h2 className="h3 m-0">Languages</h2>
            <p className="m-0 mt-1 label">From the projects that merged this person’s work and from their own repositories, split by each repository’s real language mix.</p>
          </div>
          <Languages languages={p.languages} />
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card p-6 grid gap-5 rv">
          <h2 className="h3 m-0">How the score adds up</h2>
          <Breakdown breakdown={p.breakdown} />
        </section>
        <section className="card p-6 grid gap-5 content-start rv" style={{ '--i': 1 }}>
          <h2 className="h3 m-0">Activity</h2>
          <Timeline data={p.timeline} />
          {a && (
            <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                ['Commits, last year', a.commitsLastYear],
                ['Pull requests, last year', a.prsLastYear],
                ['Reviews given, last year', a.reviewsLastYear],
                ['Reviews on others’ PRs, ever', a.reviewsGiven],
                ['Issues opened in others’ repos', a.issuesOpened],
                ['Private contributions, last year', a.privateLastYear],
              ].map(([k, v]) => (
                <div key={k} className="grid gap-0.5">
                  <dd className="m-0 mono text-lg">{num(v)}</dd>
                  <dt className="label">{k}</dt>
                </div>
              ))}
            </dl>
          )}
          {a?.privateLastYear > 0 && <p className="m-0 label">Private work is shown as a count only. It is never graded.</p>}
        </section>
      </div>

      {(p.profile?.orgs?.length > 0 || p.profile?.topOwn?.length > 0 || st?.licenses?.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-6">
          {p.profile?.orgs?.length > 0 && (
            <section className="card p-6 grid gap-4 content-start rv">
              <h2 className="h3 m-0">Organizations</h2>
              <ul className="m-0 p-0 list-none flex flex-wrap gap-3">
                {p.profile.orgs.map((o) => (
                  <li key={o.login}>
                    <a className="inline-flex items-center gap-2 chip hover:text-ink" href={`https://github.com/${o.login}`} target="_blank" rel="noreferrer noopener">
                      {o.avatarUrl && <img src={o.avatarUrl} alt="" width="18" height="18" className="rounded-sm" loading="lazy" />}{o.name || o.login}
                    </a>
                  </li>
                ))}
              </ul>
              {st && <p className="m-0 label">Work reached {st.orgProjects} organization-owned and {st.userProjects} personally owned projects{st.licenses?.length ? `, licensed ${st.licenses.join(', ')}` : ''}.</p>}
            </section>
          )}
          {p.profile?.topOwn?.length > 0 && (
            <section className="card p-6 grid gap-3 content-start rv" style={{ '--i': 1 }}>
              <h2 className="h3 m-0">Their own projects</h2>
              <ul className="m-0 p-0 list-none grid gap-2">
                {p.profile.topOwn.map((r) => (
                  <li key={r.repo}>
                    <a className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 hover:text-accent transition-colors" href={`https://github.com/${r.repo}`} target="_blank" rel="noreferrer noopener">
                      <span className="font-medium truncate">{r.repo}</span>
                      <span className="mono text-sm inline-flex items-center gap-1"><Icon name="star" size={13} />{fmtStars(r.stars)}</span>
                      {r.description && <span className="label truncate col-span-2">{r.description}</span>}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="m-0 label">Shown for context. Your own repositories are never graded.</p>
            </section>
          )}
        </div>
      )}

      <section className="grid gap-4 rv">
        <h2 className="h3 m-0">
          {projects} open source {projects === 1 ? 'project' : 'projects'} contributed to
          {projects > c.repos && <span className="muted text-base font-normal"> · {c.repos} checked</span>}
        </h2>
        <RepoList repos={p.repos} login={p.login} />
        {p.unchecked?.length > 0 && (
          <details className="card p-4" open>
            <summary className="cursor-pointer font-medium">{p.unchecked.length} more {p.unchecked.length === 1 ? 'project' : 'projects'} found, not checked in this preview</summary>
            <p className="muted text-[15px] mt-2 mb-3">GitHub allows 60 anonymous requests an hour, so these were found but not checked for who merged them. Sign in to check all of them. A certificate always does.</p>
            <ul className="m-0 p-0 list-none flex flex-wrap gap-2">
              {p.unchecked.map((u) => (
                <li key={u.repo}>
                  <a className="chip hover:text-ink" href={`https://github.com/${u.repo}/pulls?q=${encodeURIComponent(`is:pr is:merged author:${p.login}`)}`} target="_blank" rel="noreferrer noopener">{u.repo} · {u.prs}</a>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="grid gap-4 rv">
        <h2 className="h3 m-0">Top merged pull requests</h2>
        <EvidenceList items={p.evidence} />
        <p className="label m-0">Last merged {fmtDate(p.lastMergedAt)}. Each row links to GitHub so you can check who merged it.</p>
      </section>

      {children}
    </div>
  )
}
