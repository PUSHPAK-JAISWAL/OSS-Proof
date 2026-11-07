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

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const cors = {
      'Access-Control-Allow-Origin': origin === env.ALLOWED_ORIGIN ? origin : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    }
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (origin !== env.ALLOWED_ORIGIN) return new Response('Forbidden', { status: 403, headers: cors })
    const target = TARGETS[new URL(request.url).pathname]
    if (request.method !== 'POST' || !target) return new Response('Not found', { status: 404, headers: cors })

    let body
    try { body = await request.json() } catch { return new Response('Bad request', { status: 400, headers: cors }) }
    if (body.client_id !== env.CLIENT_ID) return new Response('Unknown client', { status: 403, headers: cors })

    const form = new URLSearchParams({ client_id: env.CLIENT_ID })
    if (body.device_code) {
      form.set('device_code', String(body.device_code))
      form.set('grant_type', 'urn:ietf:params:oauth:grant-type:device_code')
    }
    const upstream = await fetch(target, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: form })
    return new Response(await upstream.text(), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
  },
}
