// Cloudflare Worker: lets the OSS Proof site (a static page) use GitHub's device flow.
// GitHub's login endpoints send no CORS headers, so a browser cannot call them directly.
// This worker only forwards two calls, only for your GitHub App's client id, only from your site.
// It holds no secret and stores nothing: the device flow does not use a client secret.
//
// Variables to set on the worker:  CLIENT_ID (your GitHub App client id)   ALLOWED_ORIGIN (https://<you>.github.io)
const TARGETS = {
  '/device/code': 'https://github.com/login/device/code',
  '/device/token': 'https://github.com/login/oauth/access_token',
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
      return new Response(JSON.stringify({ ok: true, clientIdSet: Boolean(env.CLIENT_ID), allowedOrigins: allowed }, null, 2), { headers: { 'Content-Type': 'application/json' } })
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
    if (body.device_code) {
      form.set('device_code', String(body.device_code))
      form.set('grant_type', 'urn:ietf:params:oauth:grant-type:device_code')
    }
    const upstream = await fetch(target, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: form })
    return new Response(await upstream.text(), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
  },
}
