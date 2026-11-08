import { ed25519 } from '@noble/curves/ed25519.js'
import { hexToBytes, stableStringify } from '../../shared/canonical.mjs'
import { BRANCH, KEY_ID, PROFILE_DIR, PUBLIC_KEY, RAW_BASE, REPO, hasRepo } from './config'
import { getToken } from './github'

const API = 'https://api.github.com'

async function timed(url, init = {}, ms = 10000) {
  const ctl = new AbortController()
  const id = setTimeout(() => ctl.abort(), ms)
  try { return await fetch(url, { ...init, signal: ctl.signal }) } finally { clearTimeout(id) }
}

/** GitHub API call that uses the signed-in token for a bigger rate limit and quietly retries without it if it was refused. */
async function api(path, accept = 'application/vnd.github+json', ms = 10000) {
  const token = getToken()
  const headers = { Accept: accept }
  if (token) {
    const res = await timed(`${API}${path}`, { headers: { ...headers, Authorization: `Bearer ${token}` } }, ms).catch(() => null)
    if (res && res.status !== 401) return res
  }
  return timed(`${API}${path}`, { headers }, ms)
}

// raw.githubusercontent.com keeps each file for about five minutes, and different files go stale at different moments.
// So we ask GitHub for the newest commit and read every file at that exact commit. A commit never changes,
// which makes the index and the certificates always come from one consistent snapshot.
const refs = new Map()
async function resolveRef(repo, ref, force = false) {
  const key = `${repo}@${ref}`
  const hit = refs.get(key)
  if (hit?.pending) return hit.pending
  if (hit && Date.now() - hit.at < (force ? 2000 : hit.sha ? 20000 : 15000)) return hit.sha
  const pending = (async () => {
    try {
      const res = await api(`/repos/${repo}/commits/${encodeURIComponent(ref)}`, 'application/vnd.github.sha', 8000)
      const sha = res.ok ? (await res.text()).trim() : null
      return /^[0-9a-f]{40}$/.test(sha || '') ? sha : null
    } catch { return null }
  })().then((sha) => { refs.set(key, { at: Date.now(), sha }); return sha })
  refs.set(key, { ...(hit || { at: 0 }), pending })
  return pending
}

async function getJson(url, pinned) {
  const res = await timed(url, { cache: pinned ? 'default' : 'no-cache' }, 12000)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Could not load data (${res.status}).`)
  return res.json()
}

async function rawJson(repo, ref, path, force) {
  const sha = await resolveRef(repo, ref, force)
  return sha
    ? getJson(`https://raw.githubusercontent.com/${repo}/${sha}/${path}`, true)
    : getJson(`https://raw.githubusercontent.com/${repo}/${ref}/${path}?t=${Math.floor(Date.now() / 60000)}`, false)
}

const central = (path, force) => (hasRepo ? rawJson(REPO, BRANCH, `data/${path}`, force) : getJson(`${RAW_BASE}/${path}`, false))
const profile = (login, file, force) => rawJson(`${login}/${login}`, 'HEAD', `${PROFILE_DIR}/${file}`, force)

let indexCache = null
export function fetchIndex({ force = false } = {}) {
  if (!force && indexCache && Date.now() - indexCache.at < 20000) return indexCache.p
  const p = central('index.json', force)
  indexCache = { at: Date.now(), p }
  p.catch(() => { if (indexCache?.p === p) indexCache = null })
  return p
}

/** The certificate for a login, from their profile repository when the app stored it there, otherwise from this repository. */
export async function fetchCertificate(login, { force = false } = {}) {
  const index = await fetchIndex({ force }).catch(() => null)
  const entry = index?.entries?.find((e) => e.login.toLowerCase() === login.toLowerCase())
  const order = entry?.store === 'profile' ? ['profile', 'central'] : ['central', 'profile']
  for (const store of order) {
    const cert = await (store === 'profile' ? profile(entry?.login || login, 'certificate.json', force) : central(`certs/${login.toLowerCase()}.json`, force)).catch(() => null)
    if (cert) { cert._store = store; return cert }
  }
  return null
}

/** Returns "valid", "invalid" or "no-key". Never throws. */
export function checkSignature(cert, login) {
  if (!PUBLIC_KEY) return 'no-key'
  try {
    if (cert.alg !== 'ed25519' || cert.keyId !== KEY_ID) return 'invalid'
    if (cert.payload?.login?.toLowerCase() !== login.toLowerCase()) return 'invalid'
    const ok = ed25519.verify(hexToBytes(cert.signature), new TextEncoder().encode(stableStringify(cert.payload)), hexToBytes(PUBLIC_KEY))
    return ok ? 'valid' : 'invalid'
  } catch {
    return 'invalid'
  }
}

/**
 * Keyless certificates are checked against the repository's own history: the file must come from a commit that
 * GitHub itself signed and that github-actions[bot] made. Returns "valid", "invalid" or "unknown" (could not ask GitHub).
 */
export async function checkKeyless(login) {
  if (!hasRepo) return 'unknown'
  try {
    const res = await api(`/repos/${REPO}/commits?sha=${encodeURIComponent(BRANCH)}&path=${encodeURIComponent(`data/certs/${login.toLowerCase()}.json`)}&per_page=1`, undefined, 8000)
    if (!res.ok) return 'unknown'
    const [c] = await res.json()
    if (!c) return 'invalid'
    const bot = c.author?.login === 'github-actions[bot]' || c.commit?.author?.name === 'github-actions[bot]'
    return c.commit?.verification?.verified && bot ? 'valid' : 'invalid'
  } catch {
    return 'unknown'
  }
}

/** One call for every certificate kind. A file in someone's own repository must carry a real signature, since they could edit it. */
export async function checkCertificate(cert, login) {
  if (cert.alg === 'github-actions' && cert._store !== 'profile') return { kind: 'keyless', status: await checkKeyless(login) }
  return { kind: 'ed25519', status: checkSignature(cert, login) }
}
