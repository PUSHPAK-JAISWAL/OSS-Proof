import { useEffect, useRef, useState } from 'react'
import { analyzeUser, isValidLogin } from '../../shared/analyze.mjs'
import { analyzeDeep } from '../../shared/deep.mjs'
import { Breakdown, Btn, GradeMark, Icon } from '../components/ui'
import { EvidenceList } from '../components/cert'
import { requestCertificateUrl } from '../lib/config'
import { getToken, makeApi, makeGql, setToken } from '../lib/github'
import { go } from '../lib/router'

function TokenBox({ token, onChange }) {
  const [draft, setDraft] = useState(token)
  return (
    <details className="card p-4" open={Boolean(token)}>
      <summary className="cursor-pointer font-medium">Read all your pull requests with your own token (optional)</summary>
      <div className="mt-4 grid gap-3">
        <p className="m-0 muted text-[15px]">
          Without a token GitHub allows 60 requests an hour, so the preview reads only a small sample of your pull requests.
          With your own token it reads every merged pull request you have made, as the signed certificate does.
          A fine-grained token with no permissions ticked is enough. It stays in this tab, is never saved or sent
          anywhere but api.github.com, and you should never paste it into a GitHub issue.
        </p>
        <div className="flex gap-2">
          <input className="input mono" type="password" value={draft} onChange={(e) => setDraft(e.target.value.trim())} placeholder="github_pat_…" autoComplete="off" aria-label="GitHub token" />
          <Btn variant="secondary" onClick={() => onChange(draft)} className="shrink-0">{draft ? 'Use token' : 'Clear'}</Btn>
        </div>
        <a className="link text-[14px] w-fit" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer noopener">Create a token on GitHub</a>
      </div>
    </details>
  )
}

export default function Check({ username }) {
  const [input, setInput] = useState(username || '')
  const [token, setTok] = useState(getToken())
  const [state, setState] = useState({ phase: 'idle' })
  const run = useRef(0)

  const start = async (login, tk) => {
    const id = ++run.current
    setState({ phase: 'loading', step: 'Starting' })
    try {
      const onProgress = (step) => run.current === id && setState({ phase: 'loading', step })
      // With a token every merged PR is read through GraphQL. Without one, a small REST sample.
      const result = tk
        ? await analyzeDeep(login, { gql: makeGql(tk), onProgress })
        : await analyzeUser(login, { api: makeApi(tk), mode: 'anonymous', onProgress })
      if (run.current === id) setState({ phase: 'done', result })
    } catch (err) {
      if (run.current === id) setState({ phase: 'error', message: err.message })
    }
  }

  useEffect(() => {
    setInput(username || '')
    if (username && isValidLogin(username)) start(username, getToken())
    else setState({ phase: 'idle' })
    return () => { run.current++ }
  }, [username])

  const submit = (e) => {
    e.preventDefault()
    const u = input.trim().replace(/^@/, '')
    if (!isValidLogin(u)) return setState({ phase: 'error', message: 'Enter a GitHub username, for example octocat.' })
    if (u.toLowerCase() === (username || '').toLowerCase()) start(u, token)
    else go(`/check/${u}`)
  }

  const updateToken = (t) => {
    setToken(t)
    setTok(t)
    if (username) start(username, t)
  }

  const r = state.result
  return (
    <main className="page">
      <div className="wrap grid lg:grid-cols-[minmax(0,420px)_1fr] gap-10 lg:gap-16 items-start">
        <div className="grid gap-6 lg:sticky lg:top-[calc(var(--nav)+32px)]">
          <div>
            <h1 className="h2 m-0">Check a GitHub profile</h1>
            <p className="mt-4 mb-0 muted">Reads public data and shows the grade a certificate would carry. Nothing is stored.</p>
          </div>
          <form onSubmit={submit} className="grid gap-3">
            <label className="font-medium" htmlFor="login">GitHub username</label>
            <div className="flex gap-2">
              <input id="login" className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="octocat" autoComplete="off" spellCheck="false" />
              <Btn type="submit" className="shrink-0" disabled={state.phase === 'loading'}>Check</Btn>
            </div>
          </form>
          <TokenBox token={token} onChange={updateToken} />
        </div>

        <div className="min-w-0">
          {state.phase === 'idle' && (
            <div className="card p-8 grid gap-3">
              <h2 className="h3 m-0">Enter a username to begin</h2>
              <p className="m-0 muted max-w-[52ch]">
                You will see the score, the four parts of it, and every pull request that was counted, each linked to GitHub so you can check it yourself.
              </p>
            </div>
          )}

          {state.phase === 'loading' && (
            <div className="card p-8 grid gap-4" role="status" aria-live="polite">
              <div className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full border-2 border-line border-t-accent animate-spin" />
                <span className="font-medium">{state.step}</span>
              </div>
              <div className="bar"><i style={{ width: '35%' }} /></div>
            </div>
          )}

          {state.phase === 'error' && (
            <div className="card p-8 grid gap-2 border-bad/50" role="alert">
              <h2 className="h3 m-0">That did not work</h2>
              <p className="m-0 muted">{state.message}</p>
            </div>
          )}

          {state.phase === 'done' && r && (
            <div className="grid gap-10">
              <div className="flex items-center gap-6 flex-wrap">
                <GradeMark grade={r.grade} />
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <img src={r.avatarUrl} alt="" width="40" height="40" className="rounded-sm border border-line" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.name || r.login}</div>
                      <a className="link label" href={r.profileUrl} target="_blank" rel="noreferrer noopener">@{r.login}</a>
                    </div>
                  </div>
                  <p className="m-0 mt-3 text-[28px] tracking-tight leading-none">{r.score.toFixed(1)} <span className="muted text-lg">/ 100 · {r.gradeLabel}</span></p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-x-12 gap-y-8">
                <Breakdown breakdown={r.breakdown} />
                <dl className="m-0 grid gap-3 content-start">
                  {[
                    ['Merged PRs found outside own repos', r.counts.mergedFound],
                    ['Checked for who merged them', r.counts.sampled],
                    ['Counted', r.counts.counted],
                    ['Merged by yourself (not counted)', r.counts.selfMerged],
                    ['Different repos', r.counts.repos],
                    ['Active months, last 24', r.counts.activeMonths24],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
                      <dt className="text-[15px]">{k}</dt>
                      <dd className="m-0 mono text-sm">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {r.mode !== 'deep' && r.counts.sampled < r.counts.outsideOwnRepos && (
                <p className="m-0 muted text-[15px] max-w-[64ch]">
                  This quick preview checked {r.counts.sampled} of your {r.counts.outsideOwnRepos} pull requests outside your own repositories.
                  Add your own token above to read all of them. The signed certificate always reads all of them.
                </p>
              )}
              {r.counts.truncated && (
                <p className="m-0 text-warn text-[15px] max-w-[64ch]">Your history is very large, so the newest {r.counts.mergedFound} merged pull requests were read.</p>
              )}

              <section className="grid gap-4">
                <h2 className="h3 m-0">Pull requests that counted</h2>
                <EvidenceList items={r.evidence} />
              </section>

              <section className="card p-6 grid gap-4">
                <h2 className="h3 m-0">Make it official</h2>
                <p className="m-0 muted max-w-[60ch]">
                  Open a certificate request on GitHub while signed in as <span className="mono text-ink">{r.login}</span>.
                  GitHub proves who you are, a workflow re-runs the grading with a larger sample, signs it, and replies with your certificate link and badge.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Btn href={requestCertificateUrl(r.login)} external>Request signed certificate <Icon name="external" size={16} /></Btn>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
