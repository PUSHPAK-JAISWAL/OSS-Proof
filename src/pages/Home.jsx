import { useState } from 'react'
import { useCountUp, useInView, useScrollProgress, prefersReduced } from '../lib/motion'
import { GRADES } from '../../shared/config.mjs'
import { Badge, AppFrame, Btn, Icon, Mark } from '../components/ui'
import { go, scrollToId } from '../lib/router'
import { REPO_URL } from '../lib/config'

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
  return (
    <section className="screen screen--hero relative overflow-hidden">
      <div className="mesh" aria-hidden="true"><i /><i /><i /></div>
      <div className="ground-dots absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div className="wrap relative grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
        <div>
          <p className="chip mb-6">Scored from public GitHub data only</p>
          <h1 className="h1 m-0" aria-label="Contribution certificates for open source developers">
            {'Contribution certificates for open source developers'.split(' ').map((w, i) => (
              <span key={i} aria-hidden="true"><span className="hw" style={{ '--w': i }}>{w}</span>{' '}</span>
            ))}
          </h1>
          <p className="lead mt-6 mb-0">
            OSS Proof grades the pull requests that other maintainers merged into repositories you do not own,
            then signs the result so anyone can check it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Btn href="#/check" className="btn--block-sm">Get a certificate</Btn>
            <Btn variant="secondary" onClick={() => scrollToId('grading')} className="btn--block-sm">See how it grades</Btn>
          </div>
        </div>

        <Tilt className="relative">
          <span className="float absolute -top-5 -left-4 z-10 hidden sm:block" style={{ '--d': 0, '--r': '-3deg' }}><Badge grade="S" score={85} height={26} /></span>
          <span className="float absolute -bottom-5 -right-3 z-10 hidden sm:block" style={{ '--d': 2, '--r': '3deg' }}><Badge grade="A" score={72} height={26} /></span>
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
        </Tilt>
      </div>
    </section>
  )
}

function Tilt({ children, className = '' }) {
  const [t, setT] = useState({ rx: 0, ry: 0 })
  const move = (e) => {
    if (prefersReduced() || e.pointerType === 'touch') return
    const r = e.currentTarget.getBoundingClientRect()
    setT({ rx: -((e.clientY - r.top) / r.height - 0.5) * 6, ry: ((e.clientX - r.left) / r.width - 0.5) * 8 })
  }
  return (
    <div className={`tilt ${className}`} style={{ '--rx': `${t.rx}deg`, '--ry': `${t.ry}deg` }} onPointerMove={move} onPointerLeave={() => setT({ rx: 0, ry: 0 })}>
      {children}
    </div>
  )
}

function Reveal({ children, i = 0, className = '', as: Tag = 'div' }) {
  const [ref, seen] = useInView()
  return <Tag ref={ref} className={`rv ${seen ? 'in' : ''} ${className}`} style={{ '--i': i }}>{children}</Tag>
}

const STEPS = [
  { icon: 'search', title: 'Counts merged pull requests', body: 'Reads your public pull requests and keeps the ones another person merged into someone else’s repository.' },
  { icon: 'sign', title: 'Signs the result', body: 'A GitHub Action signs your score. Any browser can check the signature against the public key in this repo.' },
  { icon: 'pin', title: 'Pins a badge to your README', body: 'Paste one line of Markdown. The badge links to your certificate and shows your current grade.' },
]

function How() {
  return (
    <section id="how" className="screen">
      <div className="wrap">
        <h2 className="h2 m-0 max-w-[18ch]">How a certificate is made</h2>
        <p className="lead mt-5 mb-0">
          No database and no server. Certificates are files in this repository, written by a GitHub Action when you open an issue.
        </p>
        <ul className="mt-12 m-0 p-0 list-none grid md:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card card--lift p-6 flex flex-col gap-4">
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
          <h2 className="h2 m-0">Five grades, set high</h2>
          <p className="lead mt-5 mb-0">
            An S needs dozens of merged pull requests in busy repositories, spread over about 18 months.
            Quiet accounts and self-merged work do not get there.
          </p>
          <dl className="mt-8 mb-0 grid grid-cols-2 gap-x-6 gap-y-3 max-w-md">
            {POINTS.map(([n, p]) => (
              <div key={n} className="flex items-baseline justify-between border-b border-line pb-2">
                <dt className="font-medium">{n}</dt>
                <dd className="m-0 mono text-sm">{p} points</dd>
              </div>
            ))}
          </dl>
        </div>

        <AppFrame title="Grade ladder, scoring version 1.0.0">
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
          <h2 className="h2 m-0">A badge for your profile README</h2>
          <p className="lead mt-5 mb-0">
            Each certificate comes with an SVG badge in your grade’s colour. It links back to the signed record,
            so a visitor can check it in one click.
          </p>
          <div className="mt-8"><Btn href="#/check" className="btn--block-sm">Get a certificate</Btn></div>
        </div>

        <AppFrame title="README.md">
          <div className="p-5 sm:p-6 grid gap-5">
            <div className="flex flex-wrap gap-3">
              {['S', 'A', 'B', 'C', 'D'].map((g) => (
                <Badge key={g} grade={g} score={GRADES.find((x) => x.grade === g).min} height={26} />
              ))}
            </div>
            <pre className="mono text-[13px] leading-relaxed m-0 p-4 border border-line rounded-md bg-surface overflow-x-auto whitespace-pre-wrap break-all">{`[![OSS Proof](…/badges/you.svg)](…/#/verify/you)`}</pre>
          </div>
        </AppFrame>
      </div>
    </section>
  )
}

function Closing() {
  return (
    <section className="screen" style={{ background: 'var(--inv-bg)', color: 'var(--inv-ink)', paddingBottom: 32 }}>
      <div className="wrap flex flex-col flex-1 justify-between">
        <div className="my-auto">
          <h2 className="h2 m-0 max-w-[16ch]">Get a certificate for your GitHub account</h2>
          <p className="lead mt-5 mb-0" style={{ color: 'var(--inv-muted)' }}>
            Check your grade first. Requesting a signed certificate takes one GitHub issue.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Btn href="#/check" variant="inv" className="btn--block-sm">Get a certificate</Btn>
            <Btn href="#/explore" variant="secondary" className="btn--block-sm" style={{ color: 'var(--inv-ink)', borderColor: 'rgb(247 249 250 / .3)' }}>Browse developers</Btn>
          </div>
        </div>
        <footer className="pt-10 mt-12 border-t flex flex-wrap items-center justify-between gap-4 text-[14px]" style={{ borderColor: 'rgb(247 249 250 / .18)', color: 'var(--inv-muted)' }}>
          <span className="inline-flex items-center gap-2"><Mark size={22} /> OSS Proof is open source and not affiliated with GitHub.</span>
          <span className="flex gap-6">
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
