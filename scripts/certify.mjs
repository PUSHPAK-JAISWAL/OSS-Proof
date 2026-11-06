// Runs inside GitHub Actions when someone opens a certificate request issue.
// The requester is the issue author, which GitHub itself authenticates, so no OAuth app is needed.
import { ed25519 } from '@noble/curves/ed25519.js'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { analyzeUser, isValidLogin, summarize } from '../shared/analyze.mjs'
import { makeBadgeSvg } from '../shared/badge.mjs'
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
if (!secret || !/^[0-9a-f]{64}$/i.test(secret.trim())) fail('CERT_SIGNING_KEY is missing or is not a 64 character hex key. Run npm run keygen.')

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

let payload
try {
  payload = await analyzeUser(login, { api, mode: 'certificate', onProgress: (m) => console.log(m) })
} catch (err) {
  fail(err.message)
}

const secretKey = hexToBytes(secret.trim())
const publicKey = ed25519.getPublicKey(secretKey)
const signature = ed25519.sign(new TextEncoder().encode(stableStringify(payload)), secretKey)

const cert = { alg: 'ed25519', keyId: bytesToHex(publicKey).slice(0, 8), payload, signature: bytesToHex(signature) }
writeFileSync(certPath, JSON.stringify(cert, null, 2) + '\n')
writeFileSync(`data/badges/${file}.svg`, makeBadgeSvg({ grade: payload.grade, score: payload.score, login: payload.login }))

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
