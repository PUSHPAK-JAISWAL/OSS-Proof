import { useEffect, useRef, useState } from 'react'
import { hasRepo, REPO, REPO_URL, requestCertificateUrl } from '../lib/config'
import { checkSignature, fetchCertificate } from '../lib/verify'
import { PinPanel } from './cert'
import { Btn, fmtDate, Icon } from './ui'

const POLL_MS = 10000
const GIVE_UP_MS = 15 * 60 * 1000

// Does the special repository named after the user exist? GitHub shows its README on the profile page.
async function profileRepoState(login) {
  try {
    const res = await fetch(`https://api.github.com/repos/${login}/${login}/readme`, { headers: { Accept: 'application/vnd.github+json' } })
    if (res.ok) return 'ok'
    if (res.status === 404) return 'missing'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

// The newest certificate request this person opened in this repository, if any.
async function latestIssue(login) {
  if (!hasRepo) return null
  try {
    const q = encodeURIComponent(`repo:${REPO} is:issue author:${login} in:title "Certificate request"`)
    const res = await fetch(`https://api.github.com/search/issues?q=${q}&sort=created&order=desc&per_page=1`, { headers: { Accept: 'application/vnd.github+json' } })
    if (!res.ok) return null
    const item = (await res.json()).items?.[0]
    return item ? { url: item.html_url, state: item.state, number: item.number } : null
  } catch {
    return null
  }
}

function Step({ n, title, state, children }) {
  const done = state === 'done'
  return (
    <li className={`step ${done ? '' : 'step--active'}`}>
      <span className={`step__n ${done ? 'text-ok border-ok' : 'text-muted'}`}>{done ? <Icon name="check" size={18} /> : n}</span>
      <div className="grid gap-3 min-w-0">
        <h3 className="h3 m-0">{title}</h3>
        {children}
      </div>
    </li>
  )
}

export default function RequestFlow({ login }) {
  const [readme, setReadme] = useState('checking')
  const [cert, setCert] = useState(null)
  const [issue, setIssue] = useState(null)
  const [waiting, setWaiting] = useState(false)
  const [gaveUp, setGaveUp] = useState(false)
  const started = useRef(0)

  useEffect(() => {
    let live = true
    setReadme('checking')
    setCert(null)
    setIssue(null)
    setWaiting(false)
    setGaveUp(false)
    profileRepoState(login).then((s) => live && setReadme(s))
    fetchCertificate(login).then((c) => live && c && setCert(c)).catch(() => {})
    latestIssue(login).then((i) => live && setIssue(i))
    return () => { live = false }
  }, [login])

  // After the person opens the issue, look for the new certificate every few seconds.
  useEffect(() => {
    if (!waiting) return
    started.current = Date.now()
    const issuedBefore = cert?.payload?.issuedAt
    const id = setInterval(async () => {
      if (Date.now() - started.current > GIVE_UP_MS) {
        clearInterval(id)
        setGaveUp(true)
        setWaiting(false)
        return
      }
      const [c, i] = await Promise.all([fetchCertificate(login).catch(() => null), latestIssue(login)])
      if (i) setIssue(i)
      if (c && c.payload.issuedAt !== issuedBefore) {
        setCert(c)
        setWaiting(false)
      }
    }, POLL_MS)
    return () => clearInterval(id)
  }, [waiting, login])

  const signed = cert && (cert.alg === 'github-actions' || checkSignature(cert, login) === 'valid')
  const p = cert?.payload
  const issueLine = !issue ? 'No request found yet.' : issue.state === 'closed' ? 'Request closed. The reply on it has your links.' : 'Request open. The workflow is grading your pull requests.'

  return (
    <section className="term" aria-labelledby="flow-title">
      <div className="term__bar"><i /><i /><i /><span className="ml-2">request-certificate</span></div>
      <div className="term__body grid gap-6" style={{ whiteSpace: 'normal' }}>
      <div>
        <h2 id="flow-title" className="h3 m-0">Get your signed certificate</h2>
        <p className="m-0 mt-2 muted max-w-[62ch]">Three steps. The only thing you do on GitHub is open one issue while signed in as <span className="mono text-ink">{login}</span>.</p>
      </div>

      <ol className="m-0 p-0 list-none stepper">
        <Step n="1" title="Have a profile README" state={readme === 'ok' ? 'done' : 'todo'}>
          {readme === 'checking' && <p className="m-0 muted" role="status">Looking for the repository {login}/{login}…</p>}
          {readme === 'ok' && <p className="m-0 muted">Found <a className="link text-ink" href={`https://github.com/${login}/${login}`} target="_blank" rel="noreferrer noopener">{login}/{login}</a>. Your badge can go in its README.md.</p>}
          {(readme === 'missing' || readme === 'unknown') && (
            <>
              <p className="m-0 muted max-w-[62ch]">
                {readme === 'missing' ? 'No profile repository yet. ' : 'Could not check right now. '}
                GitHub shows the README of a public repository named exactly <span className="mono text-ink">{login}</span> on your profile, and that is where the badge goes.
              </p>
              <div><Btn variant="secondary" href={`https://github.com/new?name=${encodeURIComponent(login)}&description=${encodeURIComponent('My GitHub profile README')}&visibility=public`} external>Create {login}/{login} <Icon name="external" size={16} /></Btn></div>
              <p className="label m-0">Tick “Add a README file” on the next page.</p>
            </>
          )}
        </Step>

        <Step n="2" title="Open a certificate request" state={issue || waiting || cert ? 'done' : 'todo'}>
          <p className="m-0 muted max-w-[62ch]">
            The button opens a prefilled form. Tick the box and press <span className="text-ink">Submit new issue</span>. There is nothing to paste, and you must never paste a token into an issue.
          </p>
          <div className="flex flex-wrap gap-3">
            <Btn href={requestCertificateUrl()} external onClick={() => setWaiting(true)}>Open the request <Icon name="external" size={16} /></Btn>
            {issue && <Btn variant="secondary" href={issue.url} external>View request #{issue.number}</Btn>}
          </div>
        </Step>

        <Step n="3" title="Receive the certificate" state={signed ? 'done' : 'todo'}>
          {waiting && (
            <div className="flex items-center gap-3" role="status" aria-live="polite">
              <span className="h-4 w-4 rounded-full border-2 border-line border-t-accent animate-spin" />
              <span>Waiting for the workflow. A request takes one to three minutes, but requests run one at a time through the GitHub Actions queue, so it can take longer when many people ask at once. You can close this page: the reply on your issue will have your README tags. {issueLine}</span>
            </div>
          )}
          {!waiting && !signed && !gaveUp && <p className="m-0 muted">{issue ? issueLine : 'Press the button above, then come back to this page. It checks every ten seconds.'}</p>}
          {gaveUp && (
            <p className="m-0 text-warn max-w-[62ch]">
              Nothing arrived yet. The queue may be busy. Open <a className="link" href={`${REPO_URL}/actions`} target="_blank" rel="noreferrer noopener">the Actions tab</a> to see the run, or <a className="link" href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer noopener">the issue</a> for its reply.
            </p>
          )}
          {signed && p && (
            <div className="grid gap-4">
              <p className="m-0">Certified. Grade <span className="text-ink font-medium">{p.grade}</span>, score <span className="mono">{p.score.toFixed(1)}</span>, issued {fmtDate(p.issuedAt)}. {p.counts.repos} open source {p.counts.repos === 1 ? 'project' : 'projects'}, {p.counts.counted} merged pull requests.</p>
              <div className="flex flex-wrap gap-3">
                <Btn href={`#/verify/${p.login}`}>Open certificate page</Btn>
              </div>
              <PinPanel login={p.login} grade={p.grade} score={p.score} projects={p.counts.repos} />
            </div>
          )}
        </Step>
      </ol>
      </div>
    </section>
  )
}
