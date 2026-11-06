// Runs analyzeUser against a fake GitHub API, so the pipeline is tested without the network.
import assert from 'node:assert/strict'
import { analyzeUser } from '../shared/analyze.mjs'

const NOW = '2026-11-06T00:00:00Z'
const items = []
const prs = {}
function add(n, repo, assoc, mergedBy, lines = 50, monthsAgo = 1) {
  const merged = new Date(Date.UTC(2026, 10 - monthsAgo, 10)).toISOString()
  items.push({
    number: n,
    title: `PR ${n}`,
    html_url: `https://github.com/${repo}/pull/${n}`,
    repository_url: `https://api.github.com/repos/${repo}`,
    author_association: assoc,
    closed_at: merged,
    pull_request: { url: `https://api.github.com/repos/${repo}/pulls/${n}`, merged_at: merged },
  })
  prs[`/repos/${repo}/pulls/${n}`] = {
    number: n, merged: true, merged_at: merged, additions: lines, deletions: 0,
    merged_by: mergedBy ? { login: mergedBy, type: mergedBy.endsWith('[bot]') ? 'Bot' : 'User' } : null,
  }
}
add(1, 'big/lib', 'CONTRIBUTOR', 'maintainer', 80, 1)
add(2, 'big/lib', 'CONTRIBUTOR', 'maintainer', 3, 2)       // tiny
add(3, 'big/lib', 'CONTRIBUTOR', 'octo', 20, 3)             // self-merged: dropped
add(4, 'acme/app', 'MEMBER', 'teammate', 60, 4)             // team work
add(5, 'mine/solo', 'OWNER', 'octo', 60, 5)                 // owner: not counted
add(6, 'small/tool', 'CONTRIBUTOR', 'mergify[bot]', 60, 6)  // bot merged
add(7, 'gone/repo', 'CONTRIBUTOR', 'x', 60, 6)              // repo lookup 404s: not counted

const stars = { 'big/lib': 20000, 'acme/app': 300, 'small/tool': 40 }
let calls = 0
async function api(path) {
  calls++
  if (path === '/users/octo') return { login: 'octo', id: 1, type: 'User', created_at: '2016-01-01T00:00:00Z', location: 'Pune, India', avatar_url: 'x', html_url: 'y', name: 'Octo' }
  if (path === '/users/octo/orgs') return [{ login: 'acme' }]
  if (path.startsWith('/search/issues')) return { total_count: items.length, items }
  const repo = path.match(/^\/repos\/([^/]+\/[^/]+)$/)
  if (repo) {
    if (!(repo[1] in stars)) throw new Error('404')
    return { stargazers_count: stars[repo[1]], language: repo[1] === 'big/lib' ? 'Rust' : 'Go', full_name: repo[1] }
  }
  if (prs[path]) return prs[path]
  throw new Error('unexpected ' + path)
}

const r = await analyzeUser('octo', { api, mode: 'certificate', now: new Date(NOW) })
assert.equal(r.counts.counted, 4, 'counted PRs: 1, 2, 4, 6')
assert.equal(r.counts.selfMerged, 1)
assert.equal(r.counts.repos, 3)
assert.equal(r.country, 'India')
assert.equal(r.languages[0].name, 'Rust')
assert.ok(r.evidence.every((e) => e.mergedBy !== 'octo'))
assert.ok(r.evidence.every((e) => e.repo !== 'mine/solo'))
assert.equal(r.evidence.find((e) => e.repo === 'acme/app').class, 'team')
assert.ok(r.score > 0 && r.score < 50, `score ${r.score}`)
await assert.rejects(analyzeUser('not valid!', { api }), /valid GitHub username/)
console.log(`Analysis pipeline ok: grade ${r.grade}, score ${r.score}, ${calls} API calls.`)
