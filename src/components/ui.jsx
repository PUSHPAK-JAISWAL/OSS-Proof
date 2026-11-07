import { useState } from 'react'
import { makeBadgeSvg, makeMiniBadgeSvg } from '../../shared/badge.mjs'

export function Mark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="var(--ink)" />
      <rect x="4" y="4" width="24" height="24" rx="3" fill="none" stroke="var(--accent)" strokeWidth="2" />
      <path d="M9 16.5l4.5 4.5L23 11" fill="none" stroke="var(--bg)" strokeWidth="3" strokeLinecap="square" />
    </svg>
  )
}

export function Icon({ name, size = 20 }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l5 5" /></>,
    sign: <><path d="M5 19c3-1 4-5 7-8s6-3 7-6" /><path d="M5 19h14" /><path d="M14 5l5 5" /></>,
    pin: <><path d="M8 3h8l-1 7 3 3H6l3-3z" /><path d="M12 13v8" /></>,
    check: <path d="M5 12.5l4.5 4.5L19 7" />,
    x: <path d="M6 6l12 12M18 6L6 18" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
    moon: <path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" />,
    copy: <><rect x="8" y="8" width="12" height="12" rx="1.5" /><path d="M16 8V5.5A1.5 1.5 0 0014.5 4h-9A1.5 1.5 0 004 5.5v9A1.5 1.5 0 005.5 16H8" /></>,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" /></>,
    star: <path d="M12 3.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.8l6-.8z" />,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

export function Btn({ children, variant = 'primary', href, onClick, type = 'button', className = '', external, ...rest }) {
  const cls = `btn btn--${variant} ${className}`
  if (href) {
    return (
      <a className={cls} href={href} {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <button className={cls} type={type} onClick={onClick} {...rest}>
      {children}
    </button>
  )
}

export function AppFrame({ title, children, className = '' }) {
  return (
    <div className={`frame ${className}`} data-ui>
      <div className="frame__bar">
        <i className="frame__dot" /><i className="frame__dot" /><i className="frame__dot" />
        <span className="label ml-2 truncate">{title}</span>
      </div>
      {children}
    </div>
  )
}

export function CodeBlock({ code, label }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard blocked: the text is still selectable */ }
  }
  return (
    <div className="border border-line rounded-md bg-surface">
      <div className="flex items-center justify-between gap-3 px-3 h-10 border-b border-line">
        <span className="label">{label}</span>
        <button onClick={copy} className="inline-flex items-center gap-1.5 text-[13px] font-medium h-7 px-2 rounded-sm hover:bg-ink/10 active:translate-y-px transition-colors cursor-pointer">
          <Icon name={copied ? 'check' : 'copy'} size={14} />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="mono text-[13px] leading-relaxed p-3 m-0 overflow-x-auto whitespace-pre-wrap break-all">{code}</pre>
    </div>
  )
}

export function Badge({ grade, score, login, height = 22, mini = false, projects }) {
  const svg = (mini ? makeMiniBadgeSvg : makeBadgeSvg)({ grade, score, login, projects })
  const src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  return <img src={src} alt={`OSS Proof grade ${grade}`} height={height} style={{ height }} />
}

export function Breakdown({ breakdown }) {
  const rows = [
    ['Impact', breakdown.impact, 50, 'Merged work, weighted by how used each project is, fewer points for repeat PRs in one project'],
    ['Breadth', breakdown.breadth, 20, 'How many different projects accepted your work'],
    ['Consistency', breakdown.consistency, 20, 'Months active in the last 24'],
    ['Trust', breakdown.trust, 10, 'Account age, no self-merges, no tiny PRs'],
  ]
  return (
    <ul className="grid gap-4 m-0 p-0 list-none">
      {rows.map(([name, value, max, hint]) => (
        <li key={name}>
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-medium">{name}</span>
            <span className="mono text-sm">{value.toFixed(1)} <span className="muted">/ {max}</span></span>
          </div>
          <div className="bar mt-1.5"><i style={{ width: `${(value / max) * 100}%` }} /></div>
          <p className="label mt-1.5">{hint}</p>
        </li>
      ))}
    </ul>
  )
}

export function GradeMark({ grade, size = 96 }) {
  return (
    <div
      className="grid place-items-center border border-line rounded-lg bg-surface shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.58, fontWeight: 400, letterSpacing: '-0.05em', lineHeight: 1 }}
      aria-label={`Grade ${grade}`}
    >
      {grade === '-' ? '–' : grade}
    </div>
  )
}

export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—')
export const fmtStars = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n))
