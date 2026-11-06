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

export function PinPanel({ login, grade, score }) {
  const img = badgeUrl(login)
  const link = certificateLink(login)
  const md = `[![OSS Proof](${img})](${link})`
  const html = `<a href="${link}"><img src="${img}" alt="OSS Proof grade ${grade}" /></a>`
  return (
    <div className="grid gap-4">
      <div className="card px-4 py-5 flex items-center gap-3 flex-wrap">
        <Badge grade={grade} score={score} login={login} height={28} />
        <span className="label">Links to your certificate and updates when you renew it.</span>
      </div>
      <CodeBlock label="Markdown (README.md)" code={md} />
      <CodeBlock label="HTML" code={html} />
      <p className="label">
        Put it in your profile README: the repository named <span className="mono">{login}/{login}</span>. GitHub shows that file on your profile page.
      </p>
    </div>
  )
}
