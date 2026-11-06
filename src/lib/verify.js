import { ed25519 } from '@noble/curves/ed25519.js'
import { hexToBytes, stableStringify } from '../../shared/canonical.mjs'
import { KEY_ID, PUBLIC_KEY, RAW_BASE } from './config'

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
