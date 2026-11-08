// GitHub App authentication, with no dependencies. An app proves who it is with a short-lived signed token (a JWT),
// then trades that for an installation token that works only on the account that installed it.
import { createSign } from 'node:crypto'

const b64u = (v) => Buffer.from(v).toString('base64url')
const API = 'https://api.github.com'

export function normalizeKey(pem) {
  return String(pem || '').replace(/\\n/g, '\n').trim()
}

export function appJwt(appId, privateKey, now = Math.floor(Date.now() / 1000)) {
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const body = b64u(JSON.stringify({ iat: now - 60, exp: now + 9 * 60, iss: String(appId).trim() }))
  const sig = createSign('RSA-SHA256').update(`${head}.${body}`).sign(normalizeKey(privateKey)).toString('base64url')
  return `${head}.${body}.${sig}`
}

/**
 * Finds the app's installation on a person's account and returns a token limited to their profile repository
 * (the repository named like the account). Never throws: the reason says why there is no token.
 * reasons: not-installed, repo-not-granted, error
 */
export async function profileAccess({ appId, privateKey, login, fetchImpl = fetch }) {
  try {
    const jwt = appJwt(appId, privateKey)
    const head = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'oss-proof', Authorization: `Bearer ${jwt}` }
    const inst = await fetchImpl(`${API}/users/${encodeURIComponent(login)}/installation`, { headers: head })
    if (inst.status === 404) return { reason: 'not-installed' }
    if (!inst.ok) return { reason: 'error', detail: `installation lookup ${inst.status}` }
    const { id } = await inst.json()
    const tok = await fetchImpl(`${API}/app/installations/${id}/access_tokens`, {
      method: 'POST',
      headers: { ...head, 'Content-Type': 'application/json' },
      body: JSON.stringify({ repositories: [login], permissions: { contents: 'write' } }),
    })
    if (tok.status === 422 || tok.status === 404) return { reason: 'repo-not-granted', installationId: id }
    if (!tok.ok) return { reason: 'error', detail: `token ${tok.status}` }
    return { token: (await tok.json()).token, installationId: id }
  } catch (err) {
    return { reason: 'error', detail: err.message }
  }
}
