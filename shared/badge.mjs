// Badges are plain SVG built from the signed numbers. No external fonts, images or scripts.
// The large card plays once when it loads (a light sweep, stars appearing, the bar filling) and then
// rests, so nothing loops. Browsers and GitHub's image proxy play SMIL inside <img>, and viewers that
// do not simply show the finished card.
const THEME = {
  S: { name: 'Exceptional', a: '#ffe08a', b: '#ff9d4d', c: '#ff5d8f', glow: '#ffb457', stars: true },
  A: { name: 'Strong', a: '#7df9e0', b: '#38bdf8', c: '#4f8bff', glow: '#38d6e8', stars: true },
  B: { name: 'Solid', a: '#a5d8ff', b: '#5b9bff', c: '#3b63d9', glow: '#5b9bff', stars: false },
  C: { name: 'Emerging', a: '#e4eaee', b: '#aab6bf', c: '#76858f', glow: '#aab6bf', stars: false },
  D: { name: 'Started', a: '#ffd2a8', b: '#d9935a', c: '#a8602f', glow: '#d9935a', stars: false },
  '-': { name: 'Unrated', a: '#c8d0d4', b: '#98a5ab', c: '#6c7a80', glow: '#98a5ab', stars: false },
}

/**
 * Card themes. "grade" colours the card by grade; the others keep their own look and still show the grade letter.
 * bg: three background stops. accent: gradient override (null = the grade colours).
 */
export const BADGE_THEMES = {
  grade: { label: 'Grade colours', bg: ['#0a1318', '#13232b', '#0d1a20'], ink: '#ffffff', sub: '#9fb2ba', accent: null, font: "Verdana,'DejaVu Sans',sans-serif", inner: '#0b1419' },
  midnight: { label: 'Midnight', bg: ['#070b1f', '#101a3d', '#0a1230'], ink: '#eaf0ff', sub: '#8fa3d6', accent: ['#9ec5ff', '#5b8cff', '#7a5bff'], font: "Verdana,'DejaVu Sans',sans-serif", inner: '#080d24' },
  aurora: { label: 'Aurora', bg: ['#0b1020', '#1b1442', '#0b2a33'], ink: '#ffffff', sub: '#b8c4ee', accent: ['#7df9e0', '#a78bfa', '#ff7ac8'], font: "Verdana,'DejaVu Sans',sans-serif", inner: '#0a0f1f' },
  sunset: { label: 'Sunset', bg: ['#1f0b14', '#3a1424', '#26101a'], ink: '#fff4ee', sub: '#f0b9a5', accent: ['#ffe08a', '#ff8a4d', '#ff4d7e'], font: "Verdana,'DejaVu Sans',sans-serif", inner: '#1a0a10' },
  terminal: { label: 'Terminal', bg: ['#020a04', '#04140a', '#020a04'], ink: '#b6ffcf', sub: '#4fae73', accent: ['#9bffb8', '#3ddc84', '#1fa85a'], font: "'DejaVu Sans Mono','Courier New',monospace", inner: '#020a04', scan: true },
  neon: { label: 'Neon', bg: ['#07040f', '#120826', '#07040f'], ink: '#ffffff', sub: '#c3a6ff', accent: ['#ff4df0', '#8a5bff', '#27e6ff'], font: "Verdana,'DejaVu Sans',sans-serif", inner: '#07040f', glow: true },
  glass: { label: 'Glass', bg: ['#27323a', '#3a4852', '#222c33'], ink: '#ffffff', sub: '#c5d2d9', accent: ['#ffffff', '#cfe3ee', '#9db8c6'], font: "Verdana,'DejaVu Sans',sans-serif", inner: '#202a30' },
  paper: { label: 'Paper', bg: ['#fbfaf6', '#f1eee4', '#fbfaf6'], ink: '#14201f', sub: '#5d6b69', accent: ['#0d7480', '#0a5f69', '#0a4b53'], font: "Georgia,'Times New Roman',serif", inner: '#fbfaf6', light: true },
}
export const THEME_IDS = Object.keys(BADGE_THEMES)

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
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0-6C.6-2 2 -.6 6 0 2 .6.6 2 0 6-.6 2-2 .6-6 0-2-.6-.6-2 0-6Z" fill="#fff"><animate attributeName="opacity" values="0;1;0.55" dur="1.6s" begin="${delay}s" fill="freeze"/></path>`

/** The large card, 380 x 120. */
export function makeBadgeSvg({ grade, score, login, projects, theme = 'grade' }) {
  const gt = THEME[grade] || THEME['-']
  const th = BADGE_THEMES[theme] || BADGE_THEMES.grade
  const [ta, tb, tc] = th.accent || [gt.a, gt.b, gt.c]
  const t = { ...gt, a: ta, b: tb, c: tc }
  const g = THEME[grade] ? grade : '-'
  const pct = Math.max(0, Math.min(100, Number(score) || 0))
  const label = `OSS Proof grade ${g}, score ${pct.toFixed(1)} out of 100${login ? ` for ${login}` : ''}`
  const name = login ? `@${short(login, 17)}` : 'OSS Proof'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="120" viewBox="0 0 380 120" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title>
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${th.bg[0]}"/><stop offset=".6" stop-color="${th.bg[1]}"/><stop offset="1" stop-color="${th.bg[2]}"/></linearGradient>
<linearGradient id="ac" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.a}"/><stop offset=".55" stop-color="${t.b}"/><stop offset="1" stop-color="${t.c}"/></linearGradient>
<linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="aura" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${t.glow}" stop-opacity=".55"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></radialGradient>
<clipPath id="card"><rect width="380" height="120" rx="16"/></clipPath>
</defs>
<g clip-path="url(#card)">
<rect width="380" height="120" fill="url(#bg)"/>
<circle cx="64" cy="60" r="62" fill="url(#aura)" opacity="${th.light ? 0.35 : 1}"></circle>${th.scan ? Array.from({ length: 30 }, (_, i) => `<rect y="${i * 4}" width="380" height="1" fill="#3ddc84" opacity=".06"/>`).join('') : ''}${th.glow ? `<rect x="2" y="2" width="376" height="116" rx="14" fill="none" stroke="url(#ac)" stroke-width="5" opacity=".18"/>` : ''}
<circle cx="350" cy="14" r="70" fill="${t.c}" opacity=".12"/>
<path d="M0 98 C70 80 120 112 190 96 S320 84 380 100 V120 H0Z" fill="${t.b}" opacity=".08"/>
<rect x="-140" y="0" width="120" height="120" fill="url(#sweep)" transform="skewX(-20)"><animate attributeName="x" values="-160;460" dur="2.4s" begin="0.4s" fill="freeze"/></rect>
</g>
<rect x="1" y="1" width="378" height="118" rx="15" fill="none" stroke="url(#ac)" stroke-width="1.6" opacity=".85"/>
<g>
<polygon points="${hex(64, 60, 40)}" fill="url(#ac)"/>
<polygon points="${hex(64, 60, 33)}" fill="${th.inner}"/>
<polygon points="${hex(64, 60, 33)}" fill="none" stroke="url(#ac)" stroke-width="1" opacity=".6"/>
</g>
<text x="64" y="${g === '-' ? 71 : 74}" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="${g === '-' ? 30 : 38}" font-weight="700" fill="url(#ac)">${g === '-' ? '–' : g}</text>
${t.stars ? star(26, 24, 1.1, 0.2) + star(104, 30, 0.8, 0.6) + star(100, 96, 1, 1.0) + star(30, 92, 0.7, 1.4) : ''}
<text x="124" y="30" font-family="${th.font}" font-size="10" font-weight="700" letter-spacing="2.4" fill="url(#ac)">OSS PROOF · ${esc(t.name.toUpperCase())}</text>
<text x="124" y="56" font-family="${th.font}" font-size="17" font-weight="700" fill="${th.ink}">${esc(name)}</text>
<text x="124" y="74" font-family="${th.font}" font-size="10" fill="${th.sub}">${projects ? `${projects} open source ${projects === 1 ? 'project' : 'projects'}` : 'Verified contribution'}</text>
<rect x="124" y="88" width="130" height="7" rx="3.5" fill="${th.light ? '#000' : '#fff'}" opacity=".1"/>
<rect x="124" y="88" width="0" height="7" rx="3.5" fill="url(#ac)"><animate attributeName="width" from="0" to="${(pct * 1.3).toFixed(1)}" dur="1.4s" fill="freeze" calcMode="spline" keySplines=".2 .7 .2 1" keyTimes="0;1"/></rect>
<text x="346" y="82" text-anchor="end" font-family="${th.font}" font-size="26" font-weight="700" fill="${th.ink}">${pct.toFixed(1)}</text>
<text x="346" y="98" text-anchor="end" font-family="${th.font}" font-size="10" fill="${th.sub}">out of 100</text>
<circle cx="354" cy="22" r="8" fill="url(#ac)"/><path d="M350.2 22.2l2.7 2.7 4.9-5.3" fill="none" stroke="${th.light ? '#fff' : '#0b1419'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
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
