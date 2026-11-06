// A small GitHub REST client for the browser. The optional token lives in sessionStorage only and is
// sent to api.github.com and nowhere else.
const TOKEN_KEY = 'ossproof-token'

export const getToken = () => {
  try { return sessionStorage.getItem(TOKEN_KEY) || '' } catch { return '' }
}
export const setToken = (t) => {
  try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY) } catch { /* private mode */ }
}

const cache = new Map()
const TTL = 10 * 60 * 1000

export function makeApi(token = getToken()) {
  return async function api(path) {
    const hit = cache.get(path + token)
    if (hit && Date.now() - hit.at < TTL) return hit.data
    const res = await fetch(`https://api.github.com${path}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (res.status === 401) throw new Error('GitHub rejected that token. Remove it or paste a new one.')
    if (res.status === 403 || res.status === 429) {
      const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000
      const when = reset ? ` Resets around ${new Date(reset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.` : ''
      const err = new Error(`GitHub's rate limit is used up.${when} ${token ? '' : 'Adding a token raises the limit from 60 to 5,000 requests an hour.'}`.trim())
      err.rateLimited = true
      throw err
    }
    if (res.status === 404) throw new Error('GitHub could not find that user.')
    if (!res.ok) throw new Error(`GitHub returned an error (${res.status}). Try again in a minute.`)
    const data = await res.json()
    cache.set(path + token, { at: Date.now(), data })
    return data
  }
}
