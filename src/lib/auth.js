// Sign in with GitHub through a GitHub App.
//  - "web" mode (the worker has CLIENT_SECRET): a normal redirect to GitHub and back. GitHub shows the consent screen
//    once; later sign-ins return immediately. A refresh token keeps you signed in for months with no prompt.
//  - "device" mode (no secret on the worker): GitHub shows a short code to type. Works, but is clunkier.
// The app asks for no permissions, so these tokens can only read what anyone can already read, with a bigger allowance.
// The worker at AUTH_URL only relays the login calls; it stores nothing.
import { getToken, setToken } from './github'

export const CLIENT_ID = (import.meta.env.VITE_GH_CLIENT_ID || '').trim()
export const AUTH_URL = (import.meta.env.VITE_AUTH_URL || '').trim().replace(/\/+$/, '')
export const authAvailable = Boolean(CLIENT_ID && AUTH_URL)

const STORE = 'ossproof.auth'
const STATE = 'ossproof.state'
const RETURN = 'ossproof.return'
const redirectUri = () => `${location.origin}${location.pathname}`

const read = () => { try { return JSON.parse(localStorage.getItem(STORE) || 'null') } catch { return null } }
const write = (v) => { try { v ? localStorage.setItem(STORE, JSON.stringify(v)) : localStorage.removeItem(STORE) } catch { /* private mode */ } }

async function post(path, body) {
  let res
  try {
    res = await fetch(`${AUTH_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CLIENT_ID, ...body }) })
  } catch {
    throw new Error('Could not reach the sign-in service. Its ALLOWED_ORIGIN setting probably does not match this site, or the address is wrong.')
  }
  if (!res.ok) throw new Error(res.status === 403 ? 'The sign-in service refused this request. Its CLIENT_ID or ALLOWED_ORIGIN setting does not match.' : res.status === 501 ? 'The sign-in service has no CLIENT_SECRET yet.' : 'The sign-in service did not answer. Try again, or use a token instead.')
  return res.json()
}

let modePromise
/** "web" when the worker can hold a secret, otherwise "device". */
export function signInMode() {
  if (!authAvailable) return Promise.resolve('none')
  modePromise ||= fetch(`${AUTH_URL}/health`).then((r) => r.json()).then((h) => (h.secretSet ? 'web' : 'device')).catch(() => 'device')
  return modePromise
}

function keep(t) {
  const now = Date.now()
  write({
    access: t.access_token,
    accessUntil: now + (t.expires_in ? t.expires_in * 1000 : 8 * 3600e3),
    refresh: t.refresh_token || null,
    refreshUntil: t.refresh_token ? now + (t.refresh_token_expires_in ? t.refresh_token_expires_in * 1000 : 180 * 864e5) : 0,
  })
  setToken(t.access_token)
}

// ---- web (redirect) mode ------------------------------------------------------------------
export function startRedirectSignIn() {
  const state = crypto.getRandomValues(new Uint32Array(4)).join('-')
  try { sessionStorage.setItem(STATE, state); sessionStorage.setItem(RETURN, location.hash || '#/check') } catch { /* private mode */ }
  const q = new URLSearchParams({ client_id: CLIENT_ID, redirect_uri: redirectUri(), state })
  location.assign(`https://github.com/login/oauth/authorize?${q}`)
}

/** Finishes a redirect sign-in if the page was opened by GitHub's return, and restores a saved sign-in otherwise. */
export async function bootAuth() {
  if (!authAvailable) return
  const params = new URLSearchParams(location.search)
  const code = params.get('code')
  if (code) {
    let ret = '#/check'
    let ok = false
    try { ok = params.get('state') === sessionStorage.getItem(STATE); ret = sessionStorage.getItem(RETURN) || ret; sessionStorage.removeItem(STATE); sessionStorage.removeItem(RETURN) } catch { /* private mode */ }
    history.replaceState(null, '', `${location.pathname}${ret}`)
    if (!ok) return
    try {
      const t = await post('/oauth/token', { code, redirect_uri: redirectUri() })
      if (t.access_token) keep(t)
    } catch { /* the Check page shows the token box as before */ }
    return
  }
  const saved = read()
  if (!saved) return
  if (saved.access && saved.accessUntil - Date.now() > 60e3) return setToken(saved.access)
  if (saved.refresh && saved.refreshUntil > Date.now()) {
    try {
      const t = await post('/oauth/refresh', { refresh_token: saved.refresh })
      if (t.access_token) return keep(t)
    } catch { /* fall through to signed out */ }
  }
  write(null)
  setToken('')
}

// ---- device mode ----------------------------------------------------------------------------
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
      keep(t)
      return t.access_token
    }
    if (t.error === 'slow_down') wait += 5
    else if (t.error === 'access_denied') throw new Error('Sign-in was cancelled on GitHub.')
    else if (t.error === 'expired_token') break
    else if (t.error && t.error !== 'authorization_pending') throw new Error(t.error_description || t.error)
  }
  throw new Error('The code expired. Start again.')
}

export function signOut() {
  write(null)
  setToken('')
}
export const isSignedIn = () => Boolean(getToken())
