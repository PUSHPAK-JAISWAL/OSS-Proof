import { useEffect, useRef, useState } from 'react'
import { analyzeUser, isValidLogin } from '../../shared/analyze.mjs'
import { analyzeDeep } from '../../shared/deep.mjs'
import { Breakdown, Btn, GradeMark, Icon } from '../components/ui'
import { Aurora } from '../components/fx'
import Report from '../components/Report'
import RequestFlow from '../components/RequestFlow'
import { getToken, makeApi, makeGql, setToken } from '../lib/github'
import { authAvailable, beginSignIn, finishSignIn, signInMode, signOut, startRedirectSignIn } from '../lib/auth'
import { go } from '../lib/router'

function SignIn({ token, onToken }) {
  const [flow, setFlow] = useState(null)
  const [error, setError] = useState('')
  const abort = useRef(null)
  useEffect(() => () => abort.current?.abort(), [])
  if (!authAvailable) return null
  if (token) {
    return (
      <div className="card p-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 font-medium"><span className="text-ok"><Icon name="check" size={18} /></span>Signed in. Reading every pull request.</span>
        <Btn variant="secondary" onClick={() => { signOut(); onToken('') }}>Sign out</Btn>
      </div>
    )
  }
  const begin = async () => {
    setError('')
    try {
      if ((await signInMode()) === 'web') return startRedirectSignIn()
      const f = await beginSignIn()
      setFlow(f)
      window.open(f.verificationUri, '_blank', 'noopener')
      abort.current = new AbortController()
      const t = await finishSignIn(f, { signal: abort.current.signal })
      setFlow(null)
      onToken(t)
    } catch (e) {
      setFlow(null)
      if (e.message !== 'cancelled') setError(e.message)
    }
  }
  return (
    <div className="card p-4 grid gap-3 spot">
      <p className="m-0 font-medium">Sign in with GitHub for the full read</p>
      <p className="m-0 muted text-[15px]">Raises GitHub's limit from 60 to 5,000 requests an hour and reads every merged pull request. No permissions are requested beyond public data.</p>
      {flow ? (
        <div className="grid gap-2" role="status" aria-live="polite">
          <p className="m-0 text-[15px]">Enter this code on the GitHub page that just opened:</p>
          <p className="m-0 mono text-[28px] tracking-[0.2em]">{flow.userCode}</p>
          <a className="link text-[14px] w-fit" href={flow.verificationUri} target="_blank" rel="noreferrer noopener">Open github.com/login/device</a>
          <p className="m-0 label">Waiting for you to approve…</p>
        </div>
      ) : (
        <Btn onClick={begin} className="w-fit">Sign in with GitHub</Btn>
      )}
      {error && <p className="m-0 text-bad text-[15px]" role="alert">{error}</p>}
    </div>
  )
}

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
  const estimate = r && r.mode !== 'deep' && r.counts.sampled < r.counts.outsideOwnRepos
  const notices = r && (
    <>
      {estimate && (
        <div className="card p-5 flex gap-4 items-start border-warn/60 rv" role="note">
          <span className="text-warn mt-0.5 shrink-0"><Icon name="x" size={20} /></span>
          <div className="grid gap-1">
            <p className="m-0 font-medium">This is an estimate</p>
            <p className="m-0 muted text-[15px] max-w-[70ch]">
              Without signing in, GitHub allows 60 requests an hour, so only {r.counts.sampled} of {r.counts.outsideOwnRepos} pull requests were checked. The certificate reads all of them,
              so its grade can be higher than this one.{authAvailable ? ' Sign in above to see the exact grade now.' : ' Add your own token above to see the exact grade now.'}
            </p>
          </div>
        </div>
      )}
      {r.restrictedOrgs?.length > 0 && (
        <div className="card p-5 text-[15px] rv" role="note">Some pull requests could not be read because {r.restrictedOrgs.join(', ')} blocks this token. The grade may be slightly low.</div>
      )}
      {r.counts.truncated && (
        <p className="m-0 text-warn text-[15px] max-w-[64ch]">Your history is very large, so only the newest {r.counts.mergedFound} merged pull requests were read.</p>
      )}
    </>
  )
  return (
    <main className="page page-ground">
      <Aurora />
      <div className="wrap grid gap-10">
        <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-8 items-start">
          <div className="grid gap-6">
            <div>
              <p className="kicker mb-4">02 / check</p>
              <h1 className="h2 m-0">Check a GitHub profile</h1>
              <p className="mt-3 mb-0 muted max-w-[52ch]">Reads public data and shows the grade a certificate would carry. Nothing is stored.</p>
            </div>
            <form onSubmit={submit} className="term" data-ui>
              <div className="term__bar"><i /><i /><i /><span className="ml-2">zsh</span></div>
              <div className="term__body flex items-center flex-wrap gap-y-2">
                <label htmlFor="login" className="sr-only">GitHub username</label>
                <span className="prompt">$&nbsp;</span><span className="tok-f">oss-proof</span>&nbsp;<span className="tok-k">check</span>&nbsp;
                <input id="login" className="term-input" style={{ width: '20ch' }} value={input} onChange={(e) => setInput(e.target.value)} placeholder="octocat" autoComplete="off" spellCheck="false" />
                <button type="submit" className="term-go" disabled={state.phase === 'loading'}>run ↵</button>
              </div>
            </form>
          </div>
          <div className="grid gap-4">
            <SignIn token={token} onToken={updateToken} />
            {!authAvailable || !token ? <TokenBox token={token} onChange={updateToken} /> : null}
          </div>
        </div>

        {state.phase === 'idle' && (
          <div className="card p-8 grid gap-3">
            <h2 className="h3 m-0">Enter a username to begin</h2>
            <p className="m-0 muted max-w-[56ch]">
              You will see the score and its four parts, every open source project, what was done in each, and the pull requests behind it, each linked to GitHub so you can check it yourself.
            </p>
          </div>
        )}

        {state.phase === 'loading' && (
          <div className="term" role="status" aria-live="polite">
            <div className="term__bar"><i /><i /><i /><span className="ml-2">reading {input}</span></div>
            <div className="term__body">
              <div><span className="prompt">$</span> <span className="tok-f">oss-proof</span> <span className="tok-k">check</span> {input}</div>
              <div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full border-2 border-[#3a4e57] border-t-[var(--accent)] animate-spin" /><span>{state.step}</span></div>
              <div className="bar mt-3"><i style={{ width: '35%' }} /></div>
            </div>
          </div>
        )}

        {state.phase === 'error' && (
          <div className="card p-8 grid gap-2 border-bad/50" role="alert">
            <h2 className="h3 m-0">That did not work</h2>
            <p className="m-0 muted">{state.message}</p>
          </div>
        )}

        {state.phase === 'done' && r && (
          <Report p={r} notices={notices}>
            {r.api && <p className="m-0 label">Used {r.api.cost} of your GitHub allowance in {r.api.requests} requests{r.api.remaining != null ? `, ${r.api.remaining.toLocaleString()} left this hour` : ''}.</p>}
            <RequestFlow login={r.login} />
          </Report>
        )}
      </div>
    </main>
  )
}
