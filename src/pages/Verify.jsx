import { useEffect, useState } from 'react'
import { Btn, fmtDate, Icon } from '../components/ui'
import { Aurora } from '../components/fx'
import Report from '../components/Report'
import { PinPanel } from '../components/cert'
import RequestFlow from '../components/RequestFlow'
import { KEY_ID, RAW_BASE } from '../lib/config'
import { checkCertificate, fetchCertificate } from '../lib/verify'

const STATUS = {
  valid: { tone: 'text-ok', icon: 'check', title: 'Signature verified', body: 'This record was signed by this project’s key and has not been edited since.' },
  invalid: { tone: 'text-bad', icon: 'x', title: 'Signature does not match', body: 'This file was changed after signing, or was not signed by this project. Do not trust the numbers.' },
  checking: { tone: 'text-warn', icon: 'check', title: 'Checking the record…', body: 'Asking GitHub who wrote this file.' },
  'k-valid': { tone: 'text-ok', icon: 'check', title: 'Verified by GitHub', body: 'This record was committed by github-actions[bot] in this repository, and GitHub signed that commit. Nobody edited it by hand.' },
  'k-invalid': { tone: 'text-bad', icon: 'x', title: 'Not committed by the OSS Proof workflow', body: 'The latest change to this file was not a GitHub-signed commit by github-actions[bot]. Do not trust the numbers.' },
  'k-unknown': { tone: 'text-warn', icon: 'x', title: 'Could not ask GitHub', body: 'GitHub did not answer (rate limit or offline). Open the file history on GitHub to check the commit yourself.' },
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
        setState({ phase: 'done', cert, sig: 'checking' })
        checkCertificate(cert, login).then((r) => live && setState({ phase: 'done', cert, sig: r.kind === 'keyless' ? `k-${r.status}` : r.status }))
      })
      .catch((err) => live && setState({ phase: 'error', message: err.message }))
    return () => { live = false }
  }, [login])

  if (state.phase === 'loading') {
    return <main className="page page-ground"><Aurora /><div className="wrap" role="status"><div className="term"><div className="term__bar"><i /><i /><i /><span className="ml-2">verify</span></div><div className="term__body"><span className="prompt">$</span> <span className="tok-f">oss-proof</span> <span className="tok-k">verify</span> {login}<br /><span className="tok-c">fetching certificate…</span></div></div></div></main>
  }
  if (state.phase === 'error') {
    return <main className="page"><div className="wrap"><div className="card p-8" role="alert"><h1 className="h3 m-0">Could not load the certificate</h1><p className="muted mb-0">{state.message}</p></div></div></main>
  }
  if (state.phase === 'missing') {
    return (
      <main className="page page-ground">
        <Aurora />
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

  const ok = sig === 'valid' || sig === 'k-valid'
  return (
    <main className="page page-ground">
      <Aurora />
      <div className="wrap grid gap-8">
        <div className={`card p-5 flex gap-4 items-start ${ok ? 'border-ok/50' : 'border-current'} ${s.tone}`} role={ok ? 'status' : 'alert'}>
          <span className="mt-0.5 shrink-0"><Icon name={s.icon} size={22} /></span>
          <div className="text-ink">
            <p className="m-0 font-medium">{s.title}</p>
            <p className="m-0 muted text-[15px]">{s.body}{sig === 'valid' && <> Key <span className="mono">{KEY_ID}</span>, scoring version {p.scoringVersion}.</>} Issued {fmtDate(p.issuedAt)}.</p>
          </div>
        </div>

        <Report
          p={p}
          notices={
            <>
              {stale && <p className="m-0 text-warn text-[15px]">This certificate is more than a year old. The owner can request a fresh one.</p>}
              {p.counts.partial && p.restrictedOrgs?.length > 0 && <div className="card p-5 text-[15px]" role="note">Some pull requests could not be read because {p.restrictedOrgs.join(', ')} blocks the reading token, so this grade may be slightly low. It is re-graded automatically.</div>}
            </>
          }
        >
          <section className="grid gap-4 rv">
            <h2 className="h3 m-0">Pin it to a README</h2>
            <PinPanel login={p.login} grade={p.grade} score={p.score} projects={p.counts.repos} store={cert._store} />
          </section>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <a className="link label w-fit" href={`${RAW_BASE}/certs/${p.login.toLowerCase()}.json`} target="_blank" rel="noreferrer noopener">View the certificate JSON</a>
            <a className="link label w-fit" href={`#/check/${p.login}`}>Compare with live GitHub data</a>
          </div>
          <p className="m-0 muted text-[14px] max-w-[80ch]">
            Limits: only public GitHub activity is graded, private work is shown as a count only, and the grade measures accepted pull requests, not code quality.
            Country comes from the profile’s location text.
          </p>
        </Report>
      </div>
    </main>
  )
}
