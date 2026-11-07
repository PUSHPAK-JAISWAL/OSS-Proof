// Cloudflare Worker: lets the OSS Proof site (a static page) use GitHub's device flow.
// GitHub's login endpoints send no CORS headers, so a browser cannot call them directly.
// This worker only forwards two calls, only for your GitHub App's client id, only from your site.
// It holds no secret and stores nothing: the device flow does not use a client secret.
//
// Variables to set on the worker:
//   CLIENT_ID       your GitHub App client id
//   ALLOWED_ORIGIN  https://<you>.github.io
//   CLIENT_SECRET   (optional, add it as a *Secret*) enables the normal "redirect" sign-in and staying signed in.
//                   Without it the site falls back to the device-code flow, which needs no secret.
const TARGETS = {
  '/device/code': 'https://github.com/login/device/code',
  '/device/token': 'https://github.com/login/oauth/access_token',
  '/oauth/token': 'https://github.com/login/oauth/access_token', // code -> token (needs CLIENT_SECRET)
  '/oauth/refresh': 'https://github.com/login/oauth/access_token', // refresh token -> new token (needs CLIENT_SECRET)
}

// Tolerant of "https://you.github.io/", "https://you.github.io/OSS-Proof" and several values separated by commas.
const norm = (v) => { try { return new URL(String(v).trim()).origin } catch { return String(v || '').trim().replace(/\/+$/, '') } }

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const allowed = String(env.ALLOWED_ORIGIN || '').split(',').map(norm).filter(Boolean)
    const isAllowed = allowed.includes(origin)
    const path = new URL(request.url).pathname.replace(/\/{2,}/g, '/')

    // Open the worker's address in a browser to see whether it is set up. No secrets are shown.
    if (request.method === 'GET' && (path === '/' || path === '/health')) {
      return new Response(JSON.stringify({ ok: true, clientIdSet: Boolean(env.CLIENT_ID), secretSet: Boolean(env.CLIENT_SECRET), allowedOrigins: allowed }, null, 2), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': isAllowed ? origin : 'null', Vary: 'Origin' },
      })
    }

    const cors = {
      'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    }
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (!isAllowed) return new Response('Forbidden: this origin is not in ALLOWED_ORIGIN', { status: 403, headers: cors })
    const target = TARGETS[path]
    if (request.method !== 'POST' || !target) return new Response('Not found', { status: 404, headers: cors })

    let body
    try { body = await request.json() } catch { return new Response('Bad request', { status: 400, headers: cors }) }
    if (!env.CLIENT_ID || String(body.client_id).trim() !== String(env.CLIENT_ID).trim()) return new Response('Unknown client', { status: 403, headers: cors })

    const form = new URLSearchParams({ client_id: String(env.CLIENT_ID).trim() })
    if (path === '/oauth/token' || path === '/oauth/refresh') {
      if (!env.CLIENT_SECRET) return new Response('CLIENT_SECRET is not set on the worker', { status: 501, headers: cors })
      form.set('client_secret', String(env.CLIENT_SECRET).trim())
      if (path === '/oauth/token') {
        // The return address must belong to the allowed site, so a stolen code cannot be redeemed for another app.
        if (!allowed.some((o) => String(body.redirect_uri || '').startsWith(o + '/'))) return new Response('Bad redirect_uri', { status: 400, headers: cors })
        form.set('code', String(body.code || ''))
        form.set('redirect_uri', String(body.redirect_uri))
      } else {
        form.set('grant_type', 'refresh_token')
        form.set('refresh_token', String(body.refresh_token || ''))
      }
    } else if (body.device_code) {
      form.set('device_code', String(body.device_code))
      form.set('grant_type', 'urn:ietf:params:oauth:grant-type:device_code')
    }
    const upstream = await fetch(target, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: form })
    return new Response(await upstream.text(), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
  },
}
