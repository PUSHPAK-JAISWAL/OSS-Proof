// Sign in with GitHub through a GitHub App and the device flow. The token is the user's own, lives in this tab
// (sessionStorage) and is sent only to api.github.com. The proxy at AUTH_URL only forwards the two login calls.
import { setToken } from './github'

export const CLIENT_ID = import.meta.env.VITE_GH_CLIENT_ID || ''
export const AUTH_URL = (import.meta.env.VITE_AUTH_URL || '').replace(/\/$/, '')
export const authAvailable = Boolean(CLIENT_ID && AUTH_URL)

async function post(path, body) {
  const res = await fetch(`${AUTH_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CLIENT_ID, ...body }) })
  if (!res.ok) throw new Error('The sign-in service did not answer. Try again, or use a token instead.')
  return res.json()
}

/** Returns { userCode, verificationUri, deviceCode, interval, expiresIn }. Show the code, open the link. */
export async function beginSignIn() {
  const d = await post('/device/code', {})
  if (d.error) throw new Error(d.error_description || d.error)
  return { userCode: d.user_code, verificationUri: d.verification_uri, deviceCode: d.device_code, interval: d.interval || 5, expiresIn: d.expires_in || 900 }
}

/** Waits until the person approves on github.com/login/device. Resolves with the token and stores it. */
export async function finishSignIn({ deviceCode, interval, expiresIn }, { signal } = {}) {
  let wait = interval
  const until = Date.now() + expiresIn * 1000
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, wait * 1000))
    if (signal?.aborted) throw new Error('cancelled')
    const t = await post('/device/token', { device_code: deviceCode })
    if (t.access_token) {
      setToken(t.access_token)
      return t.access_token
    }
    if (t.error === 'slow_down') wait += 5
    else if (t.error === 'access_denied') throw new Error('Sign-in was cancelled on GitHub.')
    else if (t.error === 'expired_token') break
    else if (t.error && t.error !== 'authorization_pending') throw new Error(t.error_description || t.error)
  }
  throw new Error('The code expired. Start again.')
}

export const signOut = () => setToken('')
