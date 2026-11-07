// Runs inside GitHub Actions when someone opens a certificate request issue.
// The requester is the issue author, which GitHub itself authenticates, so no OAuth app is needed.
import { ed25519 } from '@noble/curves/ed25519.js'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { analyzeUser, isValidLogin, summarize } from '../shared/analyze.mjs'
import { analyzeDeep } from '../shared/deep.mjs'
import { makeBadgeSvg, makeMiniBadgeSvg } from '../shared/badge.mjs'
import { bytesToHex, hexToBytes, stableStringify } from '../shared/canonical.mjs'

const login = process.env.LOGIN
const token = process.env.GH_TOKEN
const secret = process.env.CERT_SIGNING_KEY
const COOLDOWN_MS = 60 * 60 * 1000

function fail(msg) {
  console.error(msg)
  writeFileSync(process.env.GITHUB_OUTPUT || '/dev/null', `status=failed\nmessage=${msg.replace(/\n/g, ' ')}\n`, { flag: 'a' })
  process.exit(1)
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

if (existsSync(certPath)) {
  const old = JSON.parse(readFileSync(certPath, 'utf8'))
  if (Date.now() - Date.parse(old.payload.issuedAt) < COOLDOWN_MS) {
    console.log('Certificate issued less than an hour ago, keeping it.')
    writeFileSync(process.env.GITHUB_OUTPUT || '/dev/null', 'status=recent\n', { flag: 'a' })
    process.exit(0)
  }
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
  const body = await res.json()
  if (body.errors?.length) {
    const err = new Error(body.errors[0].message || 'GraphQL error')
    if (body.errors.some((e) => e.type === 'RATE_LIMITED')) err.rateLimited = true
    throw err
  }
  return body.data
}

let payload
try {
  // Deep GraphQL reading first: it checks every merged PR. REST sampling is the fallback.
  try {
    payload = await analyzeDeep(login, { gql, onProgress: (m) => console.log(m) })
  } catch (err) {
    if (err.rateLimited) throw err
    console.log(`Deep reading failed (${err.message}). Falling back to sampled reading.`)
    payload = await analyzeUser(login, { api, mode: 'certificate', onProgress: (m) => console.log(m) })
  }
} catch (err) {
  fail(err.message)
}

let cert
if (hasKey) {
  const secretKey = hexToBytes(secret.trim())
  const publicKey = ed25519.getPublicKey(secretKey)
  const signature = ed25519.sign(new TextEncoder().encode(stableStringify(payload)), secretKey)
  cert = { alg: 'ed25519', keyId: bytesToHex(publicKey).slice(0, 8), payload, signature: bytesToHex(signature) }
} else {
  cert = { alg: 'github-actions', payload }
}
writeFileSync(certPath, JSON.stringify(cert, null, 2) + '\n')
const badgeArgs = { grade: payload.grade, score: payload.score, login: payload.login, projects: payload.counts.repos }
writeFileSync(`data/badges/${file}.svg`, makeBadgeSvg(badgeArgs))
writeFileSync(`data/badges/${file}-mini.svg`, makeMiniBadgeSvg(badgeArgs))

const indexPath = 'data/index.json'
const index = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')) : { entries: [] }
index.entries = [summarize(payload), ...index.entries.filter((e) => e.login.toLowerCase() !== file)].sort((a, b) => b.score - a.score)
index.updatedAt = payload.issuedAt
writeFileSync(indexPath, JSON.stringify(index, null, 1) + '\n')

console.log(`Signed ${payload.login}: grade ${payload.grade}, score ${payload.score}`)
writeFileSync(
  process.env.GITHUB_OUTPUT || '/dev/null',
  `status=ok\ngrade=${payload.grade}\nscore=${payload.score}\nfile=${file}\n`,
  { flag: 'a' },
)
