// Runs analyzeDeep against a fake GraphQL API with more than 1,000 PRs, to prove the date splitting.
import assert from 'node:assert/strict'
import { analyzeDeep } from '../shared/deep.mjs'

const NOW = new Date('2026-11-06T00:00:00Z')
const all = []
for (let i = 0; i < 1500; i++) {
  const merged = new Date(NOW.getTime() - (i % 700) * 864e5).toISOString()
  all.push({
    number: i, title: `PR ${i}`, url: `https://github.com/r${i % 40}/x/pull/${i}`, mergedAt: merged, additions: 20, deletions: 5,
    authorAssociation: i % 10 === 0 ? 'MEMBER' : 'CONTRIBUTOR',
    mergedBy: { __typename: i % 50 === 0 ? 'Bot' : 'User', login: i % 97 === 0 ? 'octo' : 'maint' },
    repository: { nameWithOwner: `o${i % 40}/r${i % 40}`, stargazerCount: 3000, isArchived: false, primaryLanguage: { name: i % 2 ? 'Rust' : 'Go' }, owner: { login: `o${i % 40}` } },
  })
}
let calls = 0
async function gql(query, vars) {
  calls++
  if (query.includes('user(login')) return { user: { login: 'octo', databaseId: 1, name: 'Octo', avatarUrl: 'x', url: 'y', location: 'Pune, India', createdAt: '2015-01-01T00:00:00Z', organizations: { nodes: [{ login: 'o3' }] } } }
  const m = vars.q.match(/merged:(\d{4}-\d\d-\d\d)\.\.(\d{4}-\d\d-\d\d)/)
  const from = Date.parse(m[1]), to = Date.parse(m[2]) + 864e5
  const hit = all.filter((p) => Date.parse(p.mergedAt) >= from && Date.parse(p.mergedAt) < to)
  const start = vars.after ? Number(vars.after) : 0
  const nodes = hit.slice(start, start + 100)
  return { search: { issueCount: Math.min(hit.length, 1000) === 1000 && hit.length > 1000 ? hit.length : hit.length, pageInfo: { hasNextPage: start + 100 < Math.min(hit.length, 1000), endCursor: String(start + 100) }, nodes } }
}

const r = await analyzeDeep('octo', { gql, now: NOW })
assert.equal(r.counts.mergedFound, 1500, 'every PR read once despite the 1,000 search cap')
assert.ok(r.counts.counted > 1300, `counted ${r.counts.counted}`)
assert.ok(r.counts.selfMerged > 0)
assert.equal(r.counts.truncated, false)
assert.equal(r.mode, 'deep')
assert.ok(r.repos.length > 20 && r.repos.length <= 40)
assert.ok(r.score > 60, `score ${r.score}`)
assert.ok(r.repos.every((x) => x.list && x.list.length <= 30), 'every project carries its PR list')
assert.equal(r.timeline.length, 24)
assert.ok(JSON.stringify(r).length < 2_000_000, 'certificate stays a sane size')
console.log('full-data size KB:', Math.round(JSON.stringify(r).length / 1024))

const small = await analyzeDeep('octo', { gql, now: NOW, maxPages: 3 })
assert.equal(small.counts.truncated, true, 'page budget reports truncation')
await assert.rejects(analyzeDeep('bad name!', { gql }), /valid GitHub username/)
console.log(`Deep analysis ok: ${r.counts.counted} counted of ${r.counts.mergedFound}, grade ${r.grade}, ${calls} requests.`)
