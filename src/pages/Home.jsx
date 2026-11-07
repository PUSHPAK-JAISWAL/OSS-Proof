import { useEffect, useRef, useState } from 'react'
import { GRADES } from '../../shared/config.mjs'
import { BADGE_THEMES, THEME_IDS } from '../../shared/badge.mjs'
import { AppFrame, Badge, Btn, Icon, Mark } from '../components/ui'
import { REPO_URL, SUPPORT_EMAIL, SUPPORT_URL } from '../lib/config'
import { go, scrollToId } from '../lib/router'

const SAMPLE = [
  ['kubernetes/kubernetes', '112k', '6 PRs'],
  ['facebook/react', '235k', '3 PRs'],
  ['rust-lang/rust', '99k', '2 PRs'],
  ['vitejs/vite', '71k', '4 PRs'],
]

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Pointer position over an element becomes --px/--py in the range -1..1 for the floating pieces. */
function useParallax(ref) {
  useEffect(() => {
    const el = ref.current
    if (!el || reduced()) return
    const move = (e) => {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--px', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3))
      el.style.setProperty('--py', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3))
    }
    el.addEventListener('pointermove', move, { passive: true })
    return () => el.removeEventListener('pointermove', move)
  }, [ref])
}

/** Counts up once to `to`. */
function Count({ to, ms = 1400 }) {
  const [n, setN] = useState(reduced() ? to : 0)
  useEffect(() => {
    if (reduced()) return
    let raf
    const t0 = performance.now()
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / ms)
      setN(Math.round(to * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, ms])
  return <>{n}</>
}

/** Marks elements with .rv as visible once, when they first scroll into view. Without JS everything stays visible. */
function useReveal() {
  useEffect(() => {
    if (reduced() || !('IntersectionObserver' in window)) return
    const root = document.documentElement
    root.classList.add('rv-on')
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target) }
    }, { threshold: 0.12 })
    document.querySelectorAll('.rv').forEach((n) => io.observe(n))
    return () => { io.disconnect(); root.classList.remove('rv-on') }
  }, [])
}

function Hero() {
  const heroRef = useRef(null)
  useParallax(heroRef)
  const [user, setUser] = useState('')
  const submit = (e) => {
    e.preventDefault()
    const u = user.trim().replace(/^@/, '')
    go(u ? `/check/${u}` : '/check')
  }
  const title = 'Proof of the open source projects you ship to'.split(' ')
  return (
    <section ref={heroRef} className="screen screen--hero hero-ground">
      <span className="blob blob--1" aria-hidden="true" /><span className="blob blob--2" aria-hidden="true" /><span className="blob blob--3" aria-hidden="true" />
      <div className="wrap grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-12 lg:gap-14 items-center">
        <div>
          <p className="kicker mb-6">oss-proof v1.2 · verified by GitHub</p>
          <h1 className="h1 m-0" aria-label={title.join(' ')}>
            {title.map((w, i) => (
              <span key={i} aria-hidden="true">
                <span className="hw" style={{ '--w': i }}><span className={i >= 3 && i <= 5 ? 'glow-text' : ''}>{w}</span></span>{' '}
              </span>
            ))}
          </h1>
          <p className="lead mt-5 mb-0">
            How many open source projects accepted your work, and what you did in each. Only pull requests that
            someone else merged into a repository you do not own count.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Btn href="#/check" className="btn--block-sm">Get a certificate</Btn>
            <Btn variant="secondary" onClick={() => scrollToId('how')} className="btn--block-sm">See the pipeline</Btn>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-8 gap-y-3">
            <span className="stat"><b><Count to={0} /></b> databases</span>
            <span className="stat"><b><Count to={4} /></b> signals</span>
            <span className="stat"><b><Count to={100} /></b> points</span>
            <span className="stat"><b><Count to={8} /></b> badge styles</span>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 min-w-0 relative">
          <div className="fl par" style={{ '--z': 22, left: '-46px', top: '38px' }} aria-hidden="true"><div className="float" style={{ '--d': '6.5s', '--r': '-2deg' }}><span className="fchip"><b>★</b> 235k · facebook/react</span></div></div>
          <div className="fl par" style={{ '--z': 30, right: '-26px', top: '-22px' }} aria-hidden="true"><div className="float" style={{ '--d': '8s', '--dl': '-2s', '--r': '2deg', '--amp': '16px' }}><span className="fchip"><b>24</b> open source projects</span></div></div>
          <div className="glowframe"><div className="term" data-ui>
            <div className="term__bar"><i /><i /><i /><span className="ml-2 truncate">zsh · sample output</span></div>
            <div className="term__body">
              <form onSubmit={submit} className="flex items-center flex-wrap gap-y-2">
                <span className="prompt">$&nbsp;</span>
                <span className="tok-f">oss-proof</span>&nbsp;<span className="tok-k">check</span>&nbsp;
                <input className="term-input" value={user} onChange={(e) => setUser(e.target.value)} placeholder="your-username" autoComplete="off" spellCheck="false" aria-label="GitHub username" />
                <button type="submit" className="term-go">run ↵</button>
              </form>
              <div className="tl" style={{ '--i': 0 }}><span className="tok-s">✓</span> 66 merged PRs outside your own repos</div>
              <div className="tl" style={{ '--i': 1 }}><span className="tok-s">✓</span> 4 dropped: you merged them yourself</div>
              <div className="tl" style={{ '--i': 2 }}><span className="tok-s">✓</span> <span className="tok-n">24</span> open source projects</div>
              <div className="mt-2">
                {SAMPLE.map(([r, st, n], i) => (
                  <div key={r} className="tl row-pop" style={{ '--i': 3 + i }}>
                    <span className="truncate"><span className="tok-c">├─ </span><span className="tok-s">{r}</span></span>
                    <span className="tok-n">★ {st}</span>
                    <span className="tok-c">{n}</span>
                  </div>
                ))}
                <div className="tl tok-c" style={{ '--i': 7 }}>└─ …and 20 more</div>
              </div>
              <div className="tl mt-2" style={{ '--i': 8 }}>
                <span className="tok-k">grade</span> <span className="tok-n">S</span> <span className="tok-c">·</span> <span className="tok-n">91.3</span><span className="tok-c">/100</span> <span className="tok-c">·</span> <span className="tok-s">verified</span>
              </div>
            </div>
          </div></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="par" style={{ '--z': 14 }}><div className="float" style={{ '--d': '7s', '--amp': '10px' }}><a href="#/explore" className="badge-tile" aria-label="Browse certified developers"><Badge grade="S" score={91.3} login="you" projects={24} height={92} theme="grade" /></a></div></div>
            <div className="par" style={{ '--z': 20 }}><div className="float" style={{ '--d': '8.4s', '--dl': '-3s', '--amp': '14px' }}><a href="#/explore" className="badge-tile" aria-label="Browse certified developers"><Badge grade="A" score={76.4} login="you" projects={11} height={92} theme="aurora" /></a></div></div>
          </div>
        </div>
      </div>
    </section>
  )
}

const PIPE = [
  { n: '01', title: 'Fetch', code: <><span className="tok-k">author</span>:<span className="tok-s">you</span> <span className="tok-k">is</span>:<span className="tok-s">pr</span> <span className="tok-k">is</span>:<span className="tok-s">merged</span>{'\n'}<span className="tok-k">-user</span>:<span className="tok-s">you</span></>, out: 'every merged PR' },
  { n: '02', title: 'Filter', code: <><span className="tok-k">if</span> (pr.mergedBy === <span className="tok-s">you</span>){'\n'}  <span className="tok-f">drop</span>(pr)</>, out: 'no self-merges' },
  { n: '03', title: 'Score', code: <><span className="tok-f">score</span> = impact + breadth{'\n'}      + consistency + trust</>, out: 'grade S to D' },
  { n: '04', title: 'Certify', code: <><span className="tok-f">commit</span>(<span className="tok-s">"cert"</span>){'\n'}  <span className="tok-c">// by github-actions[bot]</span></>, out: 'verified by GitHub' },
]

function How() {
  return (
    <section id="how" className="screen">
      <div className="wrap">
        <p className="kicker mb-4">01 / pipeline</p>
        <h2 className="h2 m-0 max-w-[22ch]">From merged pull requests to a certificate</h2>
        <p className="lead mt-4 mb-0">
          No database and no server. Certificates are files in this repository, written by a GitHub Action when you open an issue.
        </p>
        <div className="pipe mt-10">
          {PIPE.map((p, i) => (
            <div key={p.n} className="pipe__step rv" style={{ '--s': i, '--i': i }}>
              <div className="flex items-center justify-between"><span className="pipe__no">{p.n}</span><h3 className="h3 m-0">{p.title}</h3></div>
              <pre className="pipe__code m-0">{p.code}</pre>
              <span className="pipe__out"><Icon name="check" size={16} />{p.out}</span>
              {i < PIPE.length - 1 && <span className="pipe__link" style={{ '--k': i }} aria-hidden="true" />}
            </div>
          ))}
        </div>
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
          <p className="kicker mb-4">02 / grading</p>
          <h2 className="h2 m-0">Grades from S to D, tough on purpose</h2>
          <p className="lead mt-5 mb-0">
            An S needs merged work in many different, well-used projects over about 18 months.
            Ten pull requests in ten projects beat thirty in one.
          </p>
          <pre className="pipe__code mt-6 mb-0 max-w-md"><span className="tok-f">score</span> = <span className="tok-n">impact</span>(50) + <span className="tok-n">breadth</span>(20){'\n'}      + <span className="tok-n">consistency</span>(20) + <span className="tok-n">trust</span>(10)</pre>
          <dl className="mt-6 mb-0 grid grid-cols-2 gap-x-6 gap-y-3 max-w-md">
            {POINTS.map(([n, v]) => (
              <div key={n} className="flex items-baseline justify-between border-b border-line pb-2">
                <dt className="font-medium">{n}</dt>
                <dd className="m-0 mono text-sm">{v} points</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rv"><AppFrame title="Grade ladder, scoring version 1.2.0">
          <ol className="m-0 p-0 list-none divide-y divide-line">
            {GRADES.filter((g) => g.grade !== '-').map((g, gi) => (
              <li key={g.grade} className="grid grid-cols-[56px_1fr_auto] items-center gap-4 px-5 py-4 hover:bg-surface transition-colors">
                <span className="text-[34px] leading-none tracking-tighter">{g.grade}</span>
                <div>
                  <div className="font-medium">{g.label}</div>
                  <div className="bar bar--grow mt-2"><i style={{ width: `${g.min}%`, '--n': gi }} /></div>
                </div>
                <span className="mono text-sm">{g.min}+</span>
              </li>
            ))}
          </ol>
        </AppFrame></div>
      </div>
    </section>
  )
}

function Styles() {
  return (
    <section id="styles" className="screen">
      <div className="wrap">
        <p className="kicker mb-4 rv">04 / styles</p>
        <h2 className="h2 m-0 max-w-[24ch] rv" style={{ '--i': 1 }}>Eight badge styles. Pick the one that fits your profile.</h2>
        <p className="lead mt-4 mb-0 rv" style={{ '--i': 2 }}>Every certificate comes with all of them. Switch by changing one word in the link, or choose on your certificate page.</p>
        <div className="themes mt-10">
          {THEME_IDS.map((id, i) => (
            <div key={id} className="tile rv" style={{ '--i': i }}>
              <div className="float w-full" style={{ '--d': `${6 + (i % 4)}s`, '--dl': `${-i * 0.9}s`, '--amp': '7px' }}>
                <Badge grade={['S', 'A', 'A', 'S', 'S', 'A', 'B', 'A'][i]} score={[91.3, 78.2, 74.9, 88.6, 90.1, 72.0, 61.4, 79.5][i]} login="you" projects={[24, 14, 17, 21, 26, 12, 9, 15][i]} theme={id} height={120} />
              </div>
              <span className="label mono">{BADGE_THEMES[id].label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pin() {
  return (
    <section id="pin" className="screen">
      <div className="wrap grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-center">
        <div>
          <p className="kicker mb-4">03 / badge</p>
          <h2 className="h2 m-0">A badge for your profile README</h2>
          <p className="lead mt-5 mb-0">
            Each certificate comes with an SVG badge in your grade’s colour. It links back to the signed record,
            so a visitor can check it in one click.
          </p>
          <div className="mt-8"><Btn href="#/check" className="btn--block-sm">Get a certificate</Btn></div>
        </div>

        <AppFrame title="README.md">
          <div className="p-5 sm:p-6 grid gap-5 justify-items-start">
            <a href="#/explore" className="badge-tile" aria-label="Browse certified developers"><Badge grade="S" score={91.3} login="you" projects={24} height={120} /></a>
            <div className="flex flex-wrap gap-3">
              {['S', 'A', 'B', 'C', 'D'].map((g) => (
                <Badge key={g} grade={g} score={GRADES.find((x) => x.grade === g).min} height={24} mini />
              ))}
            </div>
            <pre className="pipe__code m-0 w-full">{<><span className="tok-c">[</span><span className="tok-c">![</span><span className="tok-s">OSS Proof</span><span className="tok-c">](</span><span className="tok-f">…/badges/you.svg</span><span className="tok-c">)](</span><span className="tok-f">…/#/verify/you</span><span className="tok-c">)</span></>}</pre>
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
            <h2 className="h2 m-0 max-w-[20ch]">Get an OSS Proof certificate for your GitHub account</h2>
            <p className="lead mt-5 mb-0 muted">
              Check your grade first. Requesting a signed certificate takes one GitHub issue.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Btn href="#/check" className="btn--block-sm">Get a certificate</Btn>
              <Btn href="#/explore" variant="secondary" className="btn--block-sm">Browse developers</Btn>
            </div>
          </div>
          <a href="#/explore" className="badge-tile" aria-label="Browse certified developers"><Badge grade="S" score={91.3} login="you" projects={24} height={130} /></a>
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
  useReveal()
  return (
    <main>
      <Hero />
      <How />
      <Grading />
      <Pin />
      <Styles />
      <Closing />
    </main>
  )
}
