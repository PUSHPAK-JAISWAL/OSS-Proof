import { useState } from 'react'
import { GRADES } from '../../shared/config.mjs'
import Diagram from '../components/Diagram'
import { AppFrame, Badge, Btn, Icon, Mark } from '../components/ui'
import { REPO_URL, SUPPORT_EMAIL, SUPPORT_URL } from '../lib/config'
import { go, scrollToId } from '../lib/router'

const COUNTS = [
  'Merged by someone other than you',
  'In a repository you do not own',
  'Weighted by how many people use the repo',
]
const SKIPPED = ['Your own repositories', 'Pull requests you merged yourself', 'One-line edits, at reduced weight']

function Hero() {
  const [user, setUser] = useState('')
  const submit = (e) => {
    e.preventDefault()
    const u = user.trim().replace(/^@/, '')
    go(u ? `/check/${u}` : '/check')
  }
  const title = 'Contribution certificates for open source developers'.split(' ')
  return (
    <section className="screen screen--hero hero-ground">
      <div className="wrap grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
        <div>
          <p className="chip mb-6">Scored from public GitHub data only</p>
          <h1 className="h1 m-0" aria-label={title.join(' ')}>
            {title.map((w, i) => (
              <span key={i} aria-hidden="true">
                <span className="hw" style={{ '--w': i }}><span className={i >= 3 ? 'glow-text' : ''}>{w}</span></span>{' '}
              </span>
            ))}
          </h1>
          <p className="lead mt-6 mb-0">
            OSS Proof reads every pull request that another maintainer merged into a repository you do not own,
            grades it out of 100, and signs the result. An S needs 85.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Btn href="#/check" className="btn--block-sm">Get a certificate</Btn>
            <Btn variant="secondary" onClick={() => scrollToId('grading')} className="btn--block-sm">See how it grades</Btn>
          </div>
        </div>

        <div className="grid gap-4 min-w-0">
          <div className="grid grid-cols-2 gap-4">
            <a href="#/explore" className="badge-tile" aria-label="Browse certified developers"><Badge grade="S" score={91.3} login="you" height={96} /></a>
            <a href="#/explore" className="badge-tile" aria-label="Browse certified developers"><Badge grade="A" score={76.4} login="you" height={96} /></a>
          </div>
          <AppFrame title="Check a GitHub profile">
            <form onSubmit={submit} className="p-5 sm:p-6 grid gap-5">
              <label className="grid gap-2">
                <span className="font-medium">GitHub username</span>
                <div className="flex gap-2">
                  <input className="input" value={user} onChange={(e) => setUser(e.target.value)} placeholder="octocat" autoComplete="off" spellCheck="false" aria-label="GitHub username" />
                  <Btn type="submit" className="shrink-0">Check</Btn>
                </div>
              </label>
              <div className="grid sm:grid-cols-2 gap-5 pt-1">
                <div>
                  <p className="label mb-2">Counts</p>
                  <ul className="m-0 p-0 list-none grid gap-2">
                    {COUNTS.map((t) => (
                      <li key={t} className="flex gap-2 items-start text-[15px]"><span className="text-ok mt-0.5 shrink-0"><Icon name="check" size={18} /></span>{t}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="label mb-2">Does not count</p>
                  <ul className="m-0 p-0 list-none grid gap-2">
                    {SKIPPED.map((t) => (
                      <li key={t} className="flex gap-2 items-start text-[15px]"><span className="text-bad mt-0.5 shrink-0"><Icon name="x" size={18} /></span>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </form>
          </AppFrame>
        </div>
      </div>
    </section>
  )
}

const STEPS = [
  { icon: 'search', title: 'Every merged pull request', body: 'One GraphQL query returns each PR with the person who merged it, so nothing is sampled.' },
  { icon: 'sign', title: 'A signed certificate', body: 'A GitHub Action signs your score. Any browser can check the signature against the public key in this repo.' },
  { icon: 'pin', title: 'A README badge', body: 'Paste one line of Markdown. The badge links to your certificate and shows your current grade.' },
]

const PIPELINE = {
  layout: 'timeline',
  alt: 'Merged pull requests are filtered, scored out of 100 and signed into a certificate.',
  steps: [
    { label: 'PRs', sub: 'Merged' },
    { label: 'Filter', sub: 'Not yours' },
    { label: 'Score', sub: 'Of 100' },
    { label: 'Sign', sub: 'Ed25519' },
  ],
}

function How() {
  return (
    <section id="how" className="screen">
      <div className="wrap">
        <h2 className="h2 m-0 max-w-[18ch]">How a certificate is made</h2>
        <p className="lead mt-5 mb-0">
          No database and no server. Certificates are files in this repository, written by a GitHub Action when you open an issue.
        </p>
        <div className="mt-10 card p-4 sm:p-8"><Diagram spec={PIPELINE} /></div>
        <ul className="mt-6 m-0 p-0 list-none grid md:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card card--lift spot p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="grid place-items-center h-11 w-11 rounded-md bg-surface border border-line"><Icon name={s.icon} size={22} /></span>
                <span className="mono label">0{i + 1}</span>
              </div>
              <h3 className="h3 m-0">{s.title}</h3>
              <p className="m-0 muted">{s.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

const POINTS = [['Impact', 50], ['Breadth', 20], ['Consistency', 20], ['Trust', 10]]

function Grading() {
  return (
    <section id="grading" className="screen">
      <div className="wrap grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-center">
        <div>
          <h2 className="h2 m-0">OSS Proof grades, S to D</h2>
          <p className="lead mt-5 mb-0">
            An S needs dozens of merged pull requests in busy repositories, spread over about 18 months.
            Quiet accounts and self-merged work do not get there.
          </p>
          <dl className="mt-8 mb-0 grid grid-cols-2 gap-x-6 gap-y-3 max-w-md">
            {POINTS.map(([n, v]) => (
              <div key={n} className="flex items-baseline justify-between border-b border-line pb-2">
                <dt className="font-medium">{n}</dt>
                <dd className="m-0 mono text-sm">{v} points</dd>
              </div>
            ))}
          </dl>
        </div>

        <AppFrame title="Grade ladder, scoring version 1.1.0">
          <ol className="m-0 p-0 list-none divide-y divide-line">
            {GRADES.filter((g) => g.grade !== '-').map((g) => (
              <li key={g.grade} className="grid grid-cols-[56px_1fr_auto] items-center gap-4 px-5 py-4 hover:bg-surface transition-colors">
                <span className="text-[34px] leading-none tracking-tighter">{g.grade}</span>
                <div>
                  <div className="font-medium">{g.label}</div>
                  <div className="bar mt-2"><i style={{ width: `${g.min}%` }} /></div>
                </div>
                <span className="mono text-sm">{g.min}+</span>
              </li>
            ))}
          </ol>
        </AppFrame>
      </div>
    </section>
  )
}

function Pin() {
  return (
    <section id="pin" className="screen">
      <div className="wrap grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-center">
        <div>
          <h2 className="h2 m-0">The OSS Proof badge for your profile README</h2>
          <p className="lead mt-5 mb-0">
            Each certificate comes with an SVG badge in your grade’s colour. It links back to the signed record,
            so a visitor can check it in one click.
          </p>
          <div className="mt-8"><Btn href="#/check" className="btn--block-sm">Get a certificate</Btn></div>
        </div>

        <AppFrame title="README.md">
          <div className="p-5 sm:p-6 grid gap-5 justify-items-start">
            <a href="#/explore" className="badge-tile" aria-label="Browse certified developers"><Badge grade="S" score={91.3} login="you" height={130} /></a>
            <div className="flex flex-wrap gap-3">
              {['S', 'A', 'B', 'C', 'D'].map((g) => (
                <Badge key={g} grade={g} score={GRADES.find((x) => x.grade === g).min} height={24} mini />
              ))}
            </div>
            <pre className="mono text-[13px] leading-relaxed m-0 p-4 border border-line rounded-md bg-surface overflow-x-auto whitespace-pre-wrap break-all w-full">{`[![OSS Proof](…/badges/you.svg)](…/#/verify/you)`}</pre>
          </div>
        </AppFrame>
      </div>
    </section>
  )
}

function Closing() {
  return (
    <section className="screen closing">
      <div className="wrap flex flex-col flex-1 justify-between">
        <div className="my-auto grid lg:grid-cols-[1fr_auto] gap-12 items-center">
          <div>
            <h2 className="h2 m-0 max-w-[16ch]">Get an OSS Proof certificate for your GitHub account</h2>
            <p className="lead mt-5 mb-0 muted">
              Check your grade first. Requesting a signed certificate takes one GitHub issue.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Btn href="#/check" className="btn--block-sm">Get a certificate</Btn>
              <Btn href="#/explore" variant="secondary" className="btn--block-sm">Browse developers</Btn>
            </div>
          </div>
          <a href="#/explore" className="badge-tile" aria-label="Browse certified developers"><Badge grade="S" score={91.3} login="you" height={150} /></a>
        </div>
        <footer className="pt-10 mt-12 border-t border-line flex flex-wrap items-center justify-between gap-4 text-[14px] muted">
          <span className="inline-flex items-center gap-2"><Mark size={22} /> OSS Proof is open source, built on the GitHub API, and not affiliated with GitHub.</span>
          <span className="flex gap-6">
            <a className="link" href={SUPPORT_URL} {...(SUPPORT_EMAIL ? {} : { target: '_blank', rel: 'noreferrer noopener' })}>{SUPPORT_EMAIL ? `Support: ${SUPPORT_EMAIL}` : 'Support'}</a>
            <a className="link" href={REPO_URL} target="_blank" rel="noreferrer noopener">Source on GitHub</a>
            <a className="link" href="#/explore">Developers</a>
          </span>
        </footer>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <main>
      <Hero />
      <How />
      <Grading />
      <Pin />
      <Closing />
    </main>
  )
}
