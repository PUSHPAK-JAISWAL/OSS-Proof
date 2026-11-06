// A small two-part SVG badge, drawn from the signed numbers. No external fonts, no scripts.
const COLORS = {
  S: '#0b5a63',
  A: '#0d7480',
  B: '#2f6f8f',
  C: '#66777f',
  D: '#85939a',
  '-': '#9aa5aa',
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const textWidth = (s) => Math.ceil(String(s).length * 6.4) + 16

export function makeBadgeSvg({ grade, score, login }) {
  const left = 'OSS Proof'
  const right = grade === '-' ? 'Unrated' : `${grade} · ${Number(score).toFixed(1)}`
  const lw = textWidth(left) + 8
  const rw = textWidth(right) + 4
  const w = lw + rw
  const color = COLORS[grade] || COLORS['-']
  const label = `${left}: ${right}${login ? ` for ${login}` : ''}`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="22" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title>
<clipPath id="r"><rect width="${w}" height="22" rx="3"/></clipPath>
<g clip-path="url(#r)"><rect width="${lw}" height="22" fill="#1f3038"/><rect x="${lw}" width="${rw}" height="22" fill="${color}"/></g>
<g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">
<text x="${lw / 2}" y="15">${esc(left)}</text>
<text x="${lw + rw / 2}" y="15" font-weight="700">${esc(right)}</text>
</g></svg>
`
}
