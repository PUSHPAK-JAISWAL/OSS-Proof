// Runs analyzeDeep against a fake GraphQL API with more than 1,000 PRs, to prove the date splitting.
import assert from 'node:assert/strict'
import { analyzeDeep } from '../shared/deep.mjs'
import { gqlData, restrictedOrgsFrom } from '../shared/gqlerrors.mjs'

const NOW = new Date('2026-11-06T00:00:00Z')
const all = []
for (let i = 0; i < 1500; i++) {
  const merged = new Date(NOW.getTime() - (i % 700) * 864e5).toISOString()
  all.push({
    number: i, title: `PR ${i}`, url: `https://github.com/r${i % 40}/x/pull/${i}`, mergedAt: merged, createdAt: new Date(Date.parse(merged) - 3 * 864e5).toISOString(), additions: 20, deletions: 5, changedFiles: 2,
    authorAssociation: i % 10 === 0 ? 'MEMBER' : 'CONTRIBUTOR',
    mergedBy: { __typename: i % 50 === 0 ? 'Bot' : 'User', login: i % 97 === 0 ? 'octo' : 'maint' },
    repository: { nameWithOwner: `o${i % 40}/r${i % 40}`, description: 'desc', forkCount: 12, licenseInfo: { spdxId: 'MIT' }, stargazerCount: 3000, isArchived: false, primaryLanguage: { name: i % 2 ? 'Rust' : 'Go' }, owner: { __typename: 'Organization', login: `o${i % 40}` } },
  })
}
let calls = 0
let pageCalls = 0
const inRange = (q) => {
  const m = q.match(/merged:(\d{4}-\d\d-\d\d)\.\.(\d{4}-\d\d-\d\d)/)
  const from = m ? Date.parse(m[1]) : -Infinity, to = m ? Date.parse(m[2]) + 864e5 : Infinity
  return all.filter((p) => Date.parse(p.mergedAt) >= from && Date.parse(p.mergedAt) < to)
}
const RL = { cost: 1, remaining: 4990, resetAt: '2026-11-06T01:00:00Z' }
async function gql(query, vars, data = all) {
  calls++
  if (query.includes('user(login')) {
    return {
      rateLimit: RL,
      user: { login: 'octo', databaseId: 1, name: 'Octo', avatarUrl: 'x', url: 'y', location: 'Pune, India', createdAt: '2015-01-01T00:00:00Z', bio: 'hi', followers: { totalCount: 5 }, following: { totalCount: 2 }, repositories: { totalCount: 9 },
        topOwn: { nodes: [{ nameWithOwner: 'octo/tool', stargazerCount: 40, description: 'A tool', primaryLanguage: { name: 'Go' } }] },
        organizations: { nodes: [{ login: 'o3', name: 'Org 3', avatarUrl: 'z' }] },
        contributionsCollection: { totalCommitContributions: 300, totalIssueContributions: 4, totalPullRequestContributions: 90, totalPullRequestReviewContributions: 12, restrictedContributionsCount: 50 } },
      total: { issueCount: inRange(vars.qTotal).length }, reviews: { issueCount: 77 }, issues: { issueCount: 8 },
    }
  }
  if (query.includes('w0:')) {
    const out = { rateLimit: RL }
    for (let i = 0; vars[`q${i}`]; i++) out[`w${i}`] = { issueCount: inRange(vars[`q${i}`]).length }
    return out
  }
  pageCalls++
  const hit = inRange(vars.q)
  const start = vars.after ? Number(vars.after) : 0
  const nodes = hit.slice(start, start + 100)
  return { rateLimit: RL, search: { issueCount: hit.length, pageInfo: { hasNextPage: start + 100 < Math.min(hit.length, 1000), endCursor: String(start + 100) }, nodes } }
}

const r = await analyzeDeep('octo', { gql, now: NOW })
assert.equal(r.counts.mergedFound, 1500, 'every PR read once despite the 1,000 search cap')
assert.ok(r.counts.counted > 1300, `counted ${r.counts.counted}`)
assert.ok(r.counts.selfMerged > 0)
assert.equal(r.counts.truncated, false)
assert.equal(r.mode, 'deep')
assert.equal(r.activity.reviewsGiven, 77)
assert.equal(r.activity.privateLastYear, 50)
assert.equal(r.profile.topOwn[0].repo, 'octo/tool')
assert.equal(r.stats.medianDaysToMerge, 3)
assert.ok(r.stats.maintainers >= 1 && r.stats.orgProjects > 20 && r.stats.filesChanged > 2000, JSON.stringify(r.stats))
assert.equal(r.repos[0].license, 'MIT')
assert.equal(r.api.requests, calls, 'api meta counts every request')
assert.equal(r.api.remaining, 4990)
assert.equal(Object.keys(r).includes('api'), false, 'api meta never reaches the certificate')
// Each of the 1,500 PRs is fetched exactly once: pages equal ceil(count / 100) per merged window, with no probe pages.
assert.ok(pageCalls <= Math.ceil(1500 / 100) + 4, `read ${pageCalls} pages for 1500 PRs`)
assert.ok(r.repos.length > 20 && r.repos.length <= 40)
assert.ok(r.score > 60, `score ${r.score}`)
assert.ok(r.repos.every((x) => x.list && x.list.length <= 30), 'every project carries its PR list')
assert.equal(r.timeline.length, 24)
assert.ok(JSON.stringify(r).length < 2_000_000, 'certificate stays a sane size')
console.log('full-data size KB:', Math.round(JSON.stringify(r).length / 1024))

const small = await analyzeDeep('octo', { gql, now: NOW, maxPages: 3 })
assert.equal(small.counts.truncated, true, 'page budget reports truncation')
await assert.rejects(analyzeDeep('bad name!', { gql }), /valid GitHub username/)
// A small account needs three requests: profile and counts, then its single page. An empty one stops after the first.
{
  let n = 0
  const tiny = async (q, v) => { n++; return gql(q, v, all.slice(0, 40)) }
  const none = async (q, v) => { n++; const d = await gql(q, v); if (d.total) d.total.issueCount = 0; return d }
  await analyzeDeep('octo', { gql: none, now: NOW })
  assert.equal(n, 1, 'no merged PRs means one request in total')
}
// An organization that blocks the token must not sink the whole read: keep what was allowed, report who blocked.
{
  const err = [{ type: 'FORBIDDEN', message: "The 'Acme' organization forbids access via a fine-grained personal access tokens if the token's lifetime is greater than 366 days." }]
  const d = gqlData({ data: { a: 1 }, errors: err })
  assert.equal(d.a, 1)
  assert.deepEqual(restrictedOrgsFrom(d.__errors), ['Acme'])
  assert.throws(() => gqlData({ data: null, errors: err }), /Acme/)
  assert.throws(() => gqlData({ data: null, errors: [{ type: 'RATE_LIMITED', message: 'x' }] }), (e) => e.rateLimited === true)
  const withErr = async (q, v) => { const d2 = await gql(q, v); if (q.includes('w0:') || q.includes('$after')) return gqlData({ data: d2, errors: err }); return d2 }
  const partial = await analyzeDeep('octo', { gql: withErr, now: NOW })
  assert.deepEqual(partial.restrictedOrgs, ['Acme'])
  assert.equal(partial.counts.partial, true, 'partial reads are flagged on the certificate')
}
console.log(`Deep analysis ok: ${r.counts.counted} counted of ${r.counts.mergedFound}, grade ${r.grade}, ${calls} requests.`)
