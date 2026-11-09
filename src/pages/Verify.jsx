import { useEffect, useState } from 'react'
import { Breakdown, Btn, fmtDate, GradeMark, Icon } from '../components/ui'
import { EvidenceList, PinPanel, RepoList } from '../components/cert'
import RequestFlow from '../components/RequestFlow'
import { KEY_ID, RAW_BASE } from '../lib/config'
import { checkSignature, fetchCertificate } from '../lib/verify'

const STATUS = {
  valid: { tone: 'text-ok', icon: 'check', title: 'Signature verified', body: 'This record was signed by this project’s key and has not been edited since.' },
  invalid: { tone: 'text-bad', icon: 'x', title: 'Signature does not match', body: 'This file was changed after signing, or was not signed by this project. Do not trust the numbers.' },
  'no-key': { tone: 'text-warn', icon: 'x', title: 'No public key configured', body: 'This site has no public key set, so signatures cannot be checked. The maintainer needs to run npm run keygen.' },
}

export default function Verify({ login }) {
  const [state, setState] = useState({ phase: 'loading' })

  useEffect(() => {
    let live = true
    setState({ phase: 'loading' })
    fetchCertificate(login)
      .then((cert) => {
        if (!live) return
        if (!cert) return setState({ phase: 'missing' })
        setState({ phase: 'done', cert, sig: checkSignature(cert, login) })
      })
      .catch((err) => live && setState({ phase: 'error', message: err.message }))
    return () => { live = false }
  }, [login])

  if (state.phase === 'loading') {
    return <main className="page"><div className="wrap" role="status"><p className="muted">Loading certificate…</p></div></main>
  }
  if (state.phase === 'error') {
    return <main className="page"><div className="wrap"><div className="card p-8" role="alert"><h1 className="h3 m-0">Could not load the certificate</h1><p className="muted mb-0">{state.message}</p></div></div></main>
  }
  if (state.phase === 'missing') {
    return (
      <main className="page">
        <div className="wrap max-w-3xl mx-0">
          <h1 className="h2 m-0">No certificate for @{login}</h1>
          <p className="lead mt-4 muted">Nothing has been signed for this account yet. Anyone can check a profile, and the owner can request a certificate.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Btn href={`#/check/${login}`}>Check this profile</Btn>
          </div>
          <div className="mt-12"><RequestFlow login={login} /></div>
        </div>
      </main>
    )
  }

  const { cert, sig } = state
  const p = cert.payload
  const s = STATUS[sig]
  const stale = (Date.now() - Date.parse(p.issuedAt)) / 864e5 > 365

  return (
    <main className="page">
      <div className="wrap grid gap-12">
        <div className={`card p-5 flex gap-4 items-start ${sig === 'valid' ? '' : 'border-current'} ${s.tone}`} role={sig === 'valid' ? 'status' : 'alert'}>
          <span className="mt-0.5 shrink-0"><Icon name={s.icon} size={22} /></span>
          <div className="text-ink">
            <p className="m-0 font-medium">{s.title}</p>
            <p className="m-0 muted text-[15px]">{s.body}{sig === 'valid' && <> Key <span className="mono">{KEY_ID}</span>, scoring version {p.scoringVersion}.</>}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-start">
          <div className="grid gap-10 min-w-0">
            <div className="flex items-center gap-6 flex-wrap">
              <GradeMark grade={p.grade} size={112} />
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <img src={p.avatarUrl} alt="" width="48" height="48" className="rounded-sm border border-line" />
                  <div className="min-w-0">
                    <h1 className="m-0 text-[28px] tracking-tight leading-tight truncate">{p.name || p.login}</h1>
                    <a className="link label" href={p.profileUrl} target="_blank" rel="noreferrer noopener">@{p.login}</a>
                  </div>
                </div>
                <p className="m-0 mt-4 text-[32px] tracking-tight leading-none">{p.score.toFixed(1)} <span className="muted text-lg">/ 100 · {p.gradeLabel}</span></p>
              </div>
            </div>

            <dl className="m-0 grid sm:grid-cols-2 gap-x-10 gap-y-3">
              {[
                ['Issued', fmtDate(p.issuedAt)],
                ['Last merged PR', fmtDate(p.lastMergedAt)],
                ['Country (self-declared)', p.country || 'Not stated'],
                ['Top languages', p.languages.slice(0, 3).map((l) => l.name).join(', ') || '—'],
                ['Open source projects', p.counts.repos],
                ['Merged PRs counted', p.counts.counted],
                ['Active months, last 24', p.counts.activeMonths24],
                ['Merged by themselves', p.counts.selfMerged],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
                  <dt className="text-[15px]">{k}</dt>
                  <dd className="m-0 mono text-sm text-right">{v}</dd>
                </div>
              ))}
            </dl>
            {stale && <p className="m-0 text-warn text-[15px]">This certificate is more than a year old. The owner can request a fresh one.</p>}

            <section className="grid gap-4">
              <h2 className="h3 m-0">How the score adds up</h2>
              <Breakdown breakdown={p.breakdown} />
            </section>
          </div>

          <div className="grid gap-10 min-w-0">
            <section className="grid gap-4">
              <h2 className="h3 m-0">{p.counts.repos} open source {p.counts.repos === 1 ? 'project' : 'projects'} contributed to</h2>
              <RepoList repos={p.repos} login={p.login} />
              <p className="label m-0">Each row opens that project's merged pull requests by this developer on GitHub.</p>
            </section>

            <section className="grid gap-4">
              <h2 className="h3 m-0">Top merged pull requests</h2>
              <EvidenceList items={p.evidence} />
            </section>

            <section className="grid gap-4">
              <h2 className="h3 m-0">Pin it to a README</h2>
              <PinPanel login={p.login} grade={p.grade} score={p.score} projects={p.counts.repos} />
            </section>

            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <a className="link label w-fit" href={`${RAW_BASE}/certs/${p.login.toLowerCase()}.json`} target="_blank" rel="noreferrer noopener">View the signed JSON</a>
              <a className="link label w-fit" href={`#/check/${p.login}`}>Compare with live GitHub data</a>
            </div>
          </div>
        </div>

        <p className="m-0 muted text-[14px] max-w-[80ch]">
          Limits: only public GitHub activity is visible, private work is not counted, and the grade measures accepted pull requests, not code quality.
          Country comes from the profile’s location text.
        </p>
      </div>
    </main>
  )
}
