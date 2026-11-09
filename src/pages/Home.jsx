import { useState } from 'react'
import { useCountUp, useInView, useScrollProgress, prefersReduced } from '../lib/motion'
import { GRADES } from '../../shared/config.mjs'
import { Badge, AppFrame, Btn, Icon, Mark } from '../components/ui'
import { go, scrollToId } from '../lib/router'
import { REPO_URL, SUPPORT_EMAIL, SUPPORT_URL } from '../lib/config'

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
      <div className="mesh" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="ground-dots absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div className="wrap relative grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
        <div>
          <p className="chip mb-6">Scored from public GitHub data only</p>
          <h1 className="h1 m-0" aria-label="Contribution certificates for open source developers">
            {'Contribution certificates for open source developers'.split(' ').map((w, i) => (
              <span key={i} aria-hidden="true"><span className="hw" style={{ '--w': i }}><span className={i >= 3 ? 'glow-text' : ''}>{w}</span></span>{' '}</span>
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
          <span className="float absolute -top-24 -left-6 z-10 hidden sm:block" style={{ '--d': 0, '--r': '-3deg' }}><Badge grade="S" score={91.3} login="you" height={84} /></span>
          <span className="float absolute -bottom-24 -right-8 z-10 hidden sm:block" style={{ '--d': 2, '--r': '3deg' }}><Badge grade="A" score={76.4} login="you" height={84} /></span>
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

const LANGS = ['Rust', 'TypeScript', 'Python', 'Go', 'C++', 'Java', 'Kotlin', 'Swift', 'Ruby', 'Zig', 'Elixir', 'Haskell']

function Tape() {
  const row = [...LANGS, ...LANGS]
  return (
    <div className="tape" aria-hidden="true">
      <div className="tape__row">
        {row.map((l, i) => (
          <span key={i} className="tape__w">{l} <b>/</b></span>
        ))}
      </div>
    </div>
  )
}

function Stat({ to, suffix = '', label, go }) {
  const n = useCountUp(to, go)
  return (
    <div className="stat">
      <div className="stat__n">{n}{suffix}</div>
      <div className="label mt-2">{label}</div>
    </div>
  )
}

function Stats() {
  const [ref, seen] = useInView({ threshold: 0.4 })
  return (
    <section className="py-20 sm:py-28">
      <div ref={ref} className="wrap grid grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-6">
        <Stat go={seen} to={100} label="points, split four ways" />
        <Stat go={seen} to={85} suffix="+" label="needed for an S" />
        <Stat go={seen} to={0} label="databases to run" />
        <Stat go={seen} to={1} label="signed file per developer" />
      </div>
    </section>
  )
}

function Tilt({ children, className = '' }) {
  const [t, setT] = useState({ rx: 0, ry: 0, mx: 50, my: 50 })
  const move = (e) => {
    if (prefersReduced() || e.pointerType === 'touch') return
    const r = e.currentTarget.getBoundingClientRect()
    setT({ rx: -((e.clientY - r.top) / r.height - 0.5) * 8, ry: ((e.clientX - r.left) / r.width - 0.5) * 10, mx: ((e.clientX - r.left) / r.width) * 100, my: ((e.clientY - r.top) / r.height) * 100 })
  }
  return (
    <div className={`tilt holo ${className}`} style={{ '--rx': `${t.rx}deg`, '--ry': `${t.ry}deg`, '--mx': `${t.mx}%`, '--my': `${t.my}%` }} onPointerMove={move} onPointerLeave={() => setT({ rx: 0, ry: 0, mx: 50, my: 50 })}>
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

const NODES = [
  { x: 20, label: 'Your merged PRs', sub: 'GitHub API' },
  { x: 260, label: 'Filter', sub: 'Not yours, not self-merged' },
  { x: 500, label: 'Score', sub: 'Impact, breadth, trust' },
  { x: 740, label: 'Signed certificate', sub: 'Ed25519, in this repo' },
]

function Pipeline() {
  return (
    <svg viewBox="0 0 960 150" className="w-full h-auto" role="img" aria-label="Pull requests are filtered, scored and signed into a certificate.">
      {NODES.slice(0, -1).map((n, i) => (
        <g key={n.x}>
          <path className="flow-line" d={`M${n.x + 200} 75 H${NODES[i + 1].x}`} />
          <path className="flow-dash" d={`M${n.x + 200} 75 H${NODES[i + 1].x}`} />
        </g>
      ))}
      {NODES.map((n, i) => (
        <g key={n.label} className="flow-node" style={{ '--n': i }}>
          <rect x={n.x} y="35" width="200" height="80" rx="6" fill="var(--bg)" stroke="var(--line)" strokeWidth="1.5" />
          <text x={n.x + 100} y="70" textAnchor="middle" fontSize="16" fontWeight="500" fill="var(--ink)">{n.label}</text>
          <text x={n.x + 100} y="92" textAnchor="middle" fontSize="12.5" fill="var(--muted)">{n.sub}</text>
        </g>
      ))}
    </svg>
  )
}

function How() {
  return (
    <section id="how" className="screen">
      <div className="wrap">
        <Reveal><h2 className="h2 m-0 max-w-[18ch]">How a certificate is made</h2></Reveal>
        <Reveal i={1}>
          <p className="lead mt-5 mb-0">
            No database and no server. Certificates are files in this repository, written by a GitHub Action when you open an issue.
          </p>
        </Reveal>
        <Reveal i={2}><div className="mt-10 card px-4 py-5 sm:px-8"><Pipeline /></div></Reveal>
        <ul className="mt-6 m-0 p-0 list-none grid md:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <Reveal as="li" i={i + 3} key={s.title} className="card card--lift spot p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="grid place-items-center h-11 w-11 rounded-md bg-surface border border-line"><Icon name={s.icon} size={22} /></span>
                <span className="mono label">0{i + 1}</span>
              </div>
              <h3 className="h3 m-0">{s.title}</h3>
              <p className="m-0 muted">{s.body}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}

const POINTS = [['Impact', 50], ['Breadth', 20], ['Consistency', 20], ['Trust', 10]]

function Points({ name, value, go }) {
  const n = useCountUp(value, go)
  return (
    <div className="flex items-baseline justify-between border-b border-line pb-2">
      <dt className="font-medium">{name}</dt>
      <dd className="m-0 mono text-sm">{n} points</dd>
    </div>
  )
}

function Grading() {
  const [ref, p] = useScrollProgress()
  const [seenRef, seen] = useInView({ threshold: 0.35 })
  // The disc opens over the first part of the scroll, then the panel is fully open.
  const open = Math.min(1, p / 0.7)
  const vw = typeof window === 'undefined' ? 1200 : window.innerWidth
  const vh = typeof window === 'undefined' ? 800 : window.innerHeight
  const radius = open * Math.hypot(vw, vh) * 0.6
  const content = Math.min(1, Math.max(0, (open - 0.55) / 0.35))
  return (
    <section id="grading" ref={ref} className="screen iris" style={{ '--iris': `${radius}px`, '--iris-px': `${radius}px`, '--ring-o': open > 0 && open < 0.98 ? 0.9 : 0 }}>
      <div className="iris__panel" aria-hidden="true" />
      <div className="iris__ring" aria-hidden="true" />
      <div ref={seenRef} className="wrap relative grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-center" style={{ opacity: content, transform: `translateY(${(1 - content) * 14}px)` }}>
        <div>
          <h2 className="h2 m-0">Five grades, set high</h2>
          <p className="lead mt-5 mb-0">
            An S needs dozens of merged pull requests in busy repositories, spread over about 18 months.
            Quiet accounts and self-merged work do not get there.
          </p>
          <dl className="mt-8 mb-0 grid grid-cols-2 gap-x-6 gap-y-3 max-w-md">
            {POINTS.map(([n, v]) => <Points key={n} name={n} value={v} go={seen} />)}
          </dl>
        </div>

        <AppFrame title="Grade ladder, scoring version 1.0.0">
          <ol className={`ladder m-0 p-0 list-none divide-y divide-line ${seen ? 'in' : ''}`}>
            {GRADES.filter((g) => g.grade !== '-').map((g, i) => (
              <li key={g.grade} className="grid grid-cols-[56px_1fr_auto] items-center gap-4 px-5 py-4 hover:bg-surface transition-colors">
                <span className="text-[34px] leading-none tracking-tighter">{g.grade}</span>
                <div>
                  <div className="font-medium">{g.label}</div>
                  <div className="bar mt-2"><i style={{ '--w': `${g.min}%`, '--i': i }} /></div>
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

const SLIDE = ['S', 'A', 'B', 'C', 'D', 'A', 'S', 'B']

function Pin() {
  return (
    <section id="pin" className="screen">
      <div className="wrap grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-center">
        <div>
          <Reveal><h2 className="h2 m-0">A badge for your profile README</h2></Reveal>
          <Reveal i={1}>
            <p className="lead mt-5 mb-0">
              Each certificate comes with an SVG badge in your grade’s colour. It links back to the signed record,
              so a visitor can check it in one click.
            </p>
          </Reveal>
          <Reveal i={2}><div className="mt-8"><Btn href="#/check" className="btn--block-sm">Get a certificate</Btn></div></Reveal>
        </div>

        <Reveal i={2}>
          <AppFrame title="README.md">
            <div className="p-5 sm:p-6 grid gap-5">
              <div className="overflow-hidden -mx-5 sm:-mx-6" style={{ WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)', maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)' }}>
                <div className="slide-row px-5">
                  {[...SLIDE, ...SLIDE].map((g, i) => (
                    <Badge key={i} grade={g} score={GRADES.find((x) => x.grade === g).min} height={24} mini />
                  ))}
                </div>
              </div>
              <pre className="mono text-[13px] leading-relaxed m-0 p-4 border border-line rounded-md bg-surface overflow-x-auto whitespace-pre-wrap break-all">{`[![OSS Proof](…/badges/you.svg)](…/#/verify/you)`}</pre>
            </div>
          </AppFrame>
        </Reveal>
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
      <Tape />
      <Stats />
      <How />
      <Grading />
      <Pin />
      <Closing />
    </main>
  )
}
