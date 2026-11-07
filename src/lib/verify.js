import { ed25519 } from '@noble/curves/ed25519.js'
import { hexToBytes, stableStringify } from '../../shared/canonical.mjs'
import { BRANCH, KEY_ID, PUBLIC_KEY, RAW_BASE, REPO, hasRepo } from './config'

export async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-cache' })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Could not load data (${res.status}).`)
  return res.json()
}

export const fetchCertificate = (login) => fetchJson(`${RAW_BASE}/certs/${login.toLowerCase()}.json`)
export const fetchIndex = () => fetchJson(`${RAW_BASE}/index.json`)

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
    const url = `https://api.github.com/repos/${REPO}/commits?sha=${encodeURIComponent(BRANCH)}&path=${encodeURIComponent(`data/certs/${login.toLowerCase()}.json`)}&per_page=1`
    const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } })
    if (!res.ok) return 'unknown'
    const [c] = await res.json()
    if (!c) return 'invalid'
    const bot = c.author?.login === 'github-actions[bot]' || c.commit?.author?.name === 'github-actions[bot]'
    return c.commit?.verification?.verified && bot ? 'valid' : 'invalid'
  } catch {
    return 'unknown'
  }
}

/** One call for every certificate kind. */
export async function checkCertificate(cert, login) {
  if (cert.alg === 'github-actions') return { kind: 'keyless', status: await checkKeyless(login) }
  return { kind: 'ed25519', status: checkSignature(cert, login) }
}
