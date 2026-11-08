// Runs inside GitHub Actions when someone opens a certificate request issue.
// The requester is the issue author, which GitHub itself authenticates, so no OAuth app is needed.
import { ed25519 } from '@noble/curves/ed25519.js'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { isValidLogin, summarize } from '../shared/analyze.mjs'
import { analyzeDeep } from '../shared/deep.mjs'
import { gqlData } from '../shared/gqlerrors.mjs'
import { makeBadgeSvg, makeMiniBadgeSvg, THEME_IDS } from '../shared/badge.mjs'
import { bytesToHex, hexToBytes, stableStringify } from '../shared/canonical.mjs'
import { profileAccess } from '../shared/appauth.mjs'
import { commitFiles } from '../shared/ghcommit.mjs'

const login = process.env.LOGIN
let token = process.env.READ_TOKEN || process.env.GH_TOKEN // READ_TOKEN: a real account's token. GITHUB_TOKEN cannot search other repositories.
const APP_ID = process.env.APP_ID
const APP_KEY = process.env.APP_PRIVATE_KEY
const secret = process.env.CERT_SIGNING_KEY
const COOLDOWN_MS = process.env.COOLDOWN_MS !== undefined ? Number(process.env.COOLDOWN_MS) : 60 * 60 * 1000

function fail(msg, code = 1) {
  console.error(msg)
  writeFileSync(process.env.GITHUB_OUTPUT || '/dev/null', `status=failed\nmessage=${msg.replace(/\n/g, ' ')}\n`, { flag: 'a' })
  process.exit(code)
}

if (!isValidLogin(login)) fail('The issue author is not a valid personal account.')
// A key is optional. Without one the certificate is "github-actions" kind: the Action commits it through the
// GitHub API, GitHub signs that commit, and the site checks the commit. With a key it is also ed25519 signed.
const hasKey = Boolean(secret && secret.trim())
if (hasKey && !/^[0-9a-f]{64}$/i.test(secret.trim())) fail('CERT_SIGNING_KEY is set but is not a 64 character hex key. Delete the secret to use keyless mode, or run npm run keygen.')

const file = login.toLowerCase()
const certPath = `data/certs/${file}.json`
mkdirSync('data/certs', { recursive: true })
mkdirSync('data/badges', { recursive: true })

const known = (() => {
  try { return JSON.parse(readFileSync('data/index.json', 'utf8')).entries.find((e) => e.login.toLowerCase() === file) } catch { return null }
})()
const lastIssued = known?.issuedAt || (existsSync(certPath) ? JSON.parse(readFileSync(certPath, 'utf8')).payload.issuedAt : null)
if (lastIssued && Date.now() - Date.parse(lastIssued) < COOLDOWN_MS) {
  console.log('Certificate issued less than an hour ago, keeping it.')
  writeFileSync(process.env.GITHUB_OUTPUT || '/dev/null', `status=recent\nstore=${known?.store || 'central'}\n`, { flag: 'a' })
  process.exit(0)
}

// Storage. When the app is configured, a signed certificate is kept in the person's own <login>/<login> repository,
// written by the app's bot. Anyone without the app installed keeps working through this repository.
let access = { reason: 'off' }
if (APP_ID && APP_KEY) {
  access = hasKey ? await profileAccess({ appId: APP_ID, privateKey: APP_KEY, login }) : { reason: 'no-signing-key' }
  console.log(access.token ? 'App installed: using a token for the profile repository.' : `Profile storage unavailable: ${access.reason}${access.detail ? ` (${access.detail})` : ''}`)
}

async function api(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'oss-proof-certify',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (res.status === 403 || res.status === 429) {
    const err = new Error('GitHub rate limit reached. Try again later.')
    err.rateLimited = true
    throw err
  }
  if (res.status === 404) throw new Error(`Not found: ${path}`)
  if (!res.ok) throw new Error(`GitHub returned ${res.status} for ${path}`)
  return res.json()
}

async function gql(query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'oss-proof-certify' },
    body: JSON.stringify({ query, variables }),
  })
  if (res.status === 403 || res.status === 429) {
    const err = new Error('GitHub rate limit reached. Try again later.')
    err.rateLimited = true
    throw err
  }
  return gqlData(await res.json())
}

// The app's own token has its own rate limit, so it goes first. If it sees nothing or fails, the maintainer's token reads instead.
const readers = [access.token, process.env.READ_TOKEN, process.env.GH_TOKEN].filter((t, i, all) => t && all.indexOf(t) === i)
const isReal = (t) => t === access.token || t === process.env.READ_TOKEN
let payload
let lastErr
for (const [i, t] of readers.entries()) {
  token = t
  try {
    payload = await analyzeDeep(login, { gql, onProgress: (m) => console.log(m) })
    // Zero results only count when a later, real token has nothing better to say.
    if (payload.counts.mergedFound > 0 || !readers.slice(i + 1).some(isReal)) break
    console.log('Nothing found with this token, trying the next one.')
  } catch (err) {
    lastErr = err
    console.log(`Read failed (${err.message}), ${i < readers.length - 1 ? 'trying the next token.' : 'no more tokens.'}`)
    payload = null
  }
}
if (!payload) fail(lastErr?.rateLimited ? lastErr.message : `The full read of your pull requests failed: ${lastErr?.message || 'no token available'}`, lastErr?.rateLimited ? 75 : 1)

// The Actions built-in token silently sees nothing outside this repository. Never certify "0" because of that.
if (payload.counts.mergedFound === 0 && !readers.some(isReal)) {
  fail('No merged pull requests were visible. The built-in Actions token cannot search other repositories, so the maintainer must add a repository secret named GH_READ_TOKEN (a fine-grained token with public read access). See docs/SETUP.md.')
}

function makeCert(body) {
  if (!hasKey) return { alg: 'github-actions', payload: body }
  const secretKey = hexToBytes(secret.trim())
  const publicKey = ed25519.getPublicKey(secretKey)
  const signature = ed25519.sign(new TextEncoder().encode(stableStringify(body)), secretKey)
  return { alg: 'ed25519', keyId: bytesToHex(publicKey).slice(0, 8), payload: body, signature: bytesToHex(signature) }
}
const badgeArgs = { grade: payload.grade, score: payload.score, login: payload.login, projects: payload.counts.repos }
const themeFiles = (prefix) => THEME_IDS.map((theme) => [`${prefix}${theme === 'grade' ? 'badge.svg' : `badge.${theme}.svg`}`, makeBadgeSvg({ ...badgeArgs, theme })])

let store = 'central'
if (access.token) {
  payload.store = 'profile'
  const files = [
    { path: '.oss-proof/certificate.json', contents: JSON.stringify(makeCert(payload), null, 2) + '\n' },
    ...themeFiles('.oss-proof/').map(([path, contents]) => ({ path, contents })),
    { path: '.oss-proof/badge-mini.svg', contents: makeMiniBadgeSvg(badgeArgs) },
  ]
  try {
    const url = await commitFiles({ token: access.token, repo: `${login}/${login}`, message: 'Update OSS Proof certificate', files })
    console.log(`Wrote the certificate to ${login}/${login}: ${url}`)
    store = 'profile'
  } catch (err) {
    console.log(`Could not write to ${login}/${login} (${err.message}). Keeping it in this repository instead.`)
    access = { reason: 'write-failed', detail: err.message }
    delete payload.store
  }
}
if (store === 'central') {
  payload.store = 'central'
  writeFileSync(certPath, JSON.stringify(makeCert(payload), null, 2) + '\n')
  for (const [name, svg] of themeFiles('')) writeFileSync(`data/badges/${file}${name === 'badge.svg' ? '.svg' : name.replace('badge', '')}`, svg)
  writeFileSync(`data/badges/${file}-mini.svg`, makeMiniBadgeSvg(badgeArgs))
}

const indexPath = 'data/index.json'
const index = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')) : { entries: [] }
index.entries = [{ ...summarize(payload), store }, ...index.entries.filter((e) => e.login.toLowerCase() !== file)].sort((a, b) => b.score - a.score)
index.updatedAt = payload.issuedAt
writeFileSync(indexPath, JSON.stringify(index, null, 1) + '\n')

console.log(`Signed ${payload.login}: grade ${payload.grade}, score ${payload.score}`)
writeFileSync(
  process.env.GITHUB_OUTPUT || '/dev/null',
  `status=ok\ngrade=${payload.grade}\nscore=${payload.score}\nfile=${file}\nstore=${store}\nnote=${store === 'profile' ? '' : access.reason}\nrestricted=${(payload.restrictedOrgs || []).join(', ')}\n`,
  { flag: 'a' },
)
