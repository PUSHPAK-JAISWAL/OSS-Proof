// Badges are plain SVG built from the signed numbers. No external fonts, images or scripts.
// The large card animates (a light sweep, twinkling stars, a breathing emblem). Browsers and GitHub's
// image proxy play SMIL inside <img>, and viewers that do not simply show the still card.
const THEME = {
  S: { name: 'Exceptional', a: '#ffe08a', b: '#ff9d4d', c: '#ff5d8f', glow: '#ffb457', stars: true },
  A: { name: 'Strong', a: '#7df9e0', b: '#38bdf8', c: '#4f8bff', glow: '#38d6e8', stars: true },
  B: { name: 'Solid', a: '#a5d8ff', b: '#5b9bff', c: '#3b63d9', glow: '#5b9bff', stars: false },
  C: { name: 'Emerging', a: '#e4eaee', b: '#aab6bf', c: '#76858f', glow: '#aab6bf', stars: false },
  D: { name: 'Started', a: '#ffd2a8', b: '#d9935a', c: '#a8602f', glow: '#d9935a', stars: false },
  '-': { name: 'Unrated', a: '#c8d0d4', b: '#98a5ab', c: '#6c7a80', glow: '#98a5ab', stars: false },
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const short = (s, n) => (String(s).length > n ? `${String(s).slice(0, n - 1)}…` : String(s))

function hex(cx, cy, r) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const t = (Math.PI / 3) * i - Math.PI / 2
    return `${(cx + r * Math.cos(t)).toFixed(1)},${(cy + r * Math.sin(t)).toFixed(1)}`
  })
  return pts.join(' ')
}

const star = (x, y, s, delay) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0-6C.6-2 2 -.6 6 0 2 .6.6 2 0 6-.6 2-2 .6-6 0-2-.6-.6-2 0-6Z" fill="#fff"><animate attributeName="opacity" values="0;1;0" dur="2.8s" begin="${delay}s" repeatCount="indefinite"/></path>`

/** The large card, 380 x 120. */
export function makeBadgeSvg({ grade, score, login }) {
  const t = THEME[grade] || THEME['-']
  const g = THEME[grade] ? grade : '-'
  const pct = Math.max(0, Math.min(100, Number(score) || 0))
  const label = `OSS Proof grade ${g}, score ${pct.toFixed(1)} out of 100${login ? ` for ${login}` : ''}`
  const name = login ? `@${short(login, 17)}` : 'OSS Proof'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="120" viewBox="0 0 380 120" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title>
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a1318"/><stop offset=".6" stop-color="#13232b"/><stop offset="1" stop-color="#0d1a20"/></linearGradient>
<linearGradient id="ac" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.a}"/><stop offset=".55" stop-color="${t.b}"/><stop offset="1" stop-color="${t.c}"/></linearGradient>
<linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="aura" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${t.glow}" stop-opacity=".55"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></radialGradient>
<clipPath id="card"><rect width="380" height="120" rx="16"/></clipPath>
</defs>
<g clip-path="url(#card)">
<rect width="380" height="120" fill="url(#bg)"/>
<circle cx="64" cy="60" r="62" fill="url(#aura)"><animate attributeName="opacity" values=".7;1;.7" dur="4s" repeatCount="indefinite"/></circle>
<circle cx="350" cy="14" r="70" fill="${t.c}" opacity=".12"/>
<path d="M0 98 C70 80 120 112 190 96 S320 84 380 100 V120 H0Z" fill="${t.b}" opacity=".08"/>
<rect x="-140" y="0" width="120" height="120" fill="url(#sweep)" transform="skewX(-20)"><animate attributeName="x" values="-160;460" dur="4.5s" repeatCount="indefinite"/></rect>
</g>
<rect x="1" y="1" width="378" height="118" rx="15" fill="none" stroke="url(#ac)" stroke-width="1.6" opacity=".85"/>
<g>
<animateTransform attributeName="transform" type="scale" values="1;1.04;1" dur="4s" repeatCount="indefinite" additive="sum"/>
<polygon points="${hex(64, 60, 40)}" fill="url(#ac)"/>
<polygon points="${hex(64, 60, 33)}" fill="#0b1419"/>
<polygon points="${hex(64, 60, 33)}" fill="none" stroke="url(#ac)" stroke-width="1" opacity=".6"/>
</g>
<text x="64" y="${g === '-' ? 71 : 74}" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="${g === '-' ? 30 : 38}" font-weight="700" fill="url(#ac)">${g === '-' ? '–' : g}</text>
${t.stars ? star(26, 24, 1.1, 0) + star(104, 30, 0.8, 0.9) + star(100, 96, 1, 1.7) + star(30, 92, 0.7, 2.2) : ''}
<text x="124" y="30" font-family="Verdana,'DejaVu Sans',sans-serif" font-size="10" font-weight="700" letter-spacing="2.4" fill="url(#ac)">OSS PROOF · ${esc(t.name.toUpperCase())}</text>
<text x="124" y="56" font-family="Verdana,'DejaVu Sans',sans-serif" font-size="17" font-weight="700" fill="#fff">${esc(name)}</text>
<text x="124" y="74" font-family="Verdana,'DejaVu Sans',sans-serif" font-size="10" fill="#9fb2ba">Verified contribution</text>
<rect x="124" y="88" width="130" height="7" rx="3.5" fill="#ffffff" opacity=".1"/>
<rect x="124" y="88" width="0" height="7" rx="3.5" fill="url(#ac)"><animate attributeName="width" from="0" to="${(pct * 1.3).toFixed(1)}" dur="1.4s" fill="freeze" calcMode="spline" keySplines=".2 .7 .2 1" keyTimes="0;1"/></rect>
<text x="346" y="82" text-anchor="end" font-family="Verdana,'DejaVu Sans',sans-serif" font-size="26" font-weight="700" fill="#fff">${pct.toFixed(1)}</text>
<text x="346" y="98" text-anchor="end" font-family="Verdana,'DejaVu Sans',sans-serif" font-size="10" fill="#9fb2ba">out of 100</text>
<circle cx="354" cy="22" r="8" fill="url(#ac)"/><path d="M350.2 22.2l2.7 2.7 4.9-5.3" fill="none" stroke="#0b1419" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`
}

/** The compact two-part badge, for places where a card is too large. */
export function makeMiniBadgeSvg({ grade, score, login }) {
  const t = THEME[grade] || THEME['-']
  const left = 'OSS Proof'
  const right = grade === '-' ? 'Unrated' : `${grade} · ${Number(score).toFixed(1)}`
  const lw = Math.ceil(left.length * 6.4) + 24
  const rw = Math.ceil(right.length * 6.8) + 24
  const w = lw + rw
  const label = `${left}: ${right}${login ? ` for ${login}` : ''}`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="24" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title>
<defs><linearGradient id="m" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t.b}"/><stop offset="1" stop-color="${t.c}"/></linearGradient></defs>
<clipPath id="r"><rect width="${w}" height="24" rx="5"/></clipPath>
<g clip-path="url(#r)"><rect width="${lw}" height="24" fill="#0f1c22"/><rect x="${lw}" width="${rw}" height="24" fill="url(#m)"/></g>
<g fill="#fff" font-family="Verdana,'DejaVu Sans',sans-serif" font-size="11" text-anchor="middle">
<text x="${lw / 2}" y="16">${esc(left)}</text>
<text x="${lw + rw / 2}" y="16" font-weight="700">${esc(right)}</text>
</g></svg>
`
}
