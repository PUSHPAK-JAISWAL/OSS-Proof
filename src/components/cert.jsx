import { badgeUrl, certificateLink } from '../lib/config'
import { Badge, CodeBlock, fmtDate, fmtStars, Icon } from './ui'

const CLASS_LABEL = { external: 'Outside contributor', team: 'Team member' }

export function EvidenceList({ items }) {
  if (!items?.length) return <p className="muted">No counted pull requests yet.</p>
  return (
    <ul className="m-0 p-0 list-none border border-line rounded-lg divide-y divide-line">
      {items.map((e) => (
        <li key={e.url}>
          <a
            href={e.url}
            target="_blank"
            rel="noreferrer noopener"
            className="group grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_150px] gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface transition-colors"
          >
            <span className="font-medium truncate">{e.title || `Pull request #${e.number}`}</span>
            <span className="muted inline-flex items-center justify-end gap-1 text-sm mono"><Icon name="star" size={14} />{fmtStars(e.stars)}</span>
            <span className="label truncate">{e.repo} #{e.number} · merged by {e.mergedBy} · {fmtDate(e.mergedAt)}</span>
            <span className="label text-right whitespace-nowrap">{CLASS_LABEL[e.class] || e.class}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

export function RepoList({ repos, login }) {
  if (!repos?.length) return <p className="muted">No projects counted yet.</p>
  return (
    <ul className="m-0 p-0 list-none border border-line rounded-lg divide-y divide-line">
      {repos.map((r) => (
        <li key={r.repo}>
          <a
            href={`https://github.com/${r.repo}/pulls?q=${encodeURIComponent(`is:pr is:merged author:${login}`)}`}
            target="_blank"
            rel="noreferrer noopener"
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface transition-colors"
          >
            <span className="font-medium truncate">{r.repo}</span>
            <span className="muted inline-flex items-center justify-end gap-1 text-sm mono"><Icon name="star" size={14} />{fmtStars(r.stars)}</span>
            <span className="label truncate">
              {r.prs} merged {r.prs === 1 ? 'PR' : 'PRs'}{r.language ? ` · ${r.language}` : ''}
              {r.first ? ` · ${r.first === r.last ? fmtDate(r.first) : `${fmtDate(r.first)} to ${fmtDate(r.last)}`}` : ''}
            </span>
            <span className="label text-right whitespace-nowrap">{CLASS_LABEL[r.class] || ''}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

export function PinPanel({ login, grade, score, projects }) {
  const link = certificateLink(login)
  const big = badgeUrl(login)
  const mini = badgeUrl(login, true)
  const md = `[![OSS Proof](${big})](${link})`
  const mdMini = `[![OSS Proof](${mini})](${link})`
  const html = `<a href="${link}"><img src="${big}" alt="OSS Proof grade ${grade}" width="380" /></a>`
  return (
    <div className="grid gap-4">
      <div className="card px-4 py-5 grid gap-4 justify-items-start">
        <Badge grade={grade} score={score} login={login} projects={projects} height={120} />
        <div className="flex items-center gap-3 flex-wrap">
          <Badge grade={grade} score={score} login={login} height={24} mini />
          <span className="label">Card and compact versions. Both link to your certificate.</span>
        </div>
      </div>
      <CodeBlock label="Markdown, card (README.md)" code={md} />
      <CodeBlock label="Markdown, compact" code={mdMini} />
      <CodeBlock label="HTML, card" code={html} />
      <p className="label">
        Put it in your profile README: the repository named <span className="mono">{login}/{login}</span>. GitHub shows that file on your profile page.
      </p>
    </div>
  )
}
