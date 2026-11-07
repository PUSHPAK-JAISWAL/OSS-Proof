// Offline checks for the scoring rules, the signature round trip and the badge. Run: npm test
import assert from 'node:assert/strict'
import { ed25519 } from '@noble/curves/ed25519.js'
import { mergeIndex, pickStale } from '../shared/mergeindex.mjs'
import { makeBadgeSvg, makeMiniBadgeSvg } from '../shared/badge.mjs'
import { bytesToHex, hexToBytes, stableStringify } from '../shared/canonical.mjs'
import { countryFromLocation } from '../shared/country.mjs'
import { gradeFor, scoreEvidence } from '../shared/score.mjs'

const now = '2026-11-06T00:00:00Z'
const month = (i) => new Date(Date.UTC(2026, 10 - i, 15)).toISOString()
const pr = (over = {}) => ({ repo: 'a/b', stars: 1000, class: 'external', lines: 40, botMerged: false, mergedAt: month(1), ...over })
const ctx = { now, accountCreatedAt: '2018-01-01T00:00:00Z', selfMerged: 0, sampled: 1 }

// Nothing counted earns nothing, however old the account is.
assert.equal(scoreEvidence([], ctx).score, 0)
assert.equal(scoreEvidence([], ctx).grade, '-')

// A casual contributor: 10 PRs, 5 repos, 6 months. Should land low.
const casual = Array.from({ length: 10 }, (_, i) => pr({ repo: `o/r${i % 5}`, mergedAt: month(i % 6) }))
const c = scoreEvidence(casual, { ...ctx, sampled: 10 })
assert.ok(c.score > 20 && c.score < 50, `casual score ${c.score}`)

// A heavy, steady contributor should reach the top grades, and only then.
const heavy = Array.from({ length: 60 }, (_, i) => pr({ repo: `o/r${i % 24}`, stars: 5000, mergedAt: month(i % 22) }))
const h = scoreEvidence(heavy, { ...ctx, sampled: 60 })
assert.ok(h.score >= 85, `heavy score ${h.score}`)
assert.equal(h.grade, 'S')

// Team work counts for less than outside work. Tiny PRs and bot merges count for less again.
const ext = scoreEvidence([pr()], ctx).breakdown.impact
assert.ok(scoreEvidence([pr({ class: 'team' })], ctx).breakdown.impact < ext)
assert.ok(scoreEvidence([pr({ lines: 1 })], ctx).breakdown.impact < ext)
assert.ok(scoreEvidence([pr({ botMerged: true })], ctx).breakdown.impact < ext)

// Self-merged PRs hurt trust.
const clean = scoreEvidence([pr()], { ...ctx, sampled: 1 }).breakdown.trust
const dirty = scoreEvidence([pr()], { ...ctx, selfMerged: 4, sampled: 5 }).breakdown.trust
assert.ok(dirty < clean)

{
  const mk = (repo, i) => ({ repo, stars: 500, class: 'external', lines: 40, botMerged: false, mergedAt: month(i % 12) })
  const oneRepo = Array.from({ length: 30 }, (_, i) => mk('o/one', i))
  const manyRepos = Array.from({ length: 10 }, (_, i) => mk(`o/r${i}`, i))
  assert.ok(scoreEvidence(manyRepos, ctx).score > scoreEvidence(oneRepo, ctx).score, '10 projects must beat 30 PRs in one project')
}
assert.equal(gradeFor(85).grade, 'S')
assert.equal(gradeFor(84.9).grade, 'A')
assert.equal(gradeFor(11.9).grade, '-')

// Signatures survive key order changes and fail on any edit.
const secret = ed25519.utils.randomSecretKey()
const pub = ed25519.getPublicKey(secret)
const payload = { b: 2, a: { z: 1, y: [3, 2, 1] }, login: 'octocat' }
const sig = bytesToHex(ed25519.sign(new TextEncoder().encode(stableStringify(payload)), secret))
const reordered = { login: 'octocat', a: { y: [3, 2, 1], z: 1 }, b: 2 }
assert.ok(ed25519.verify(hexToBytes(sig), new TextEncoder().encode(stableStringify(reordered)), pub))
const forged = { ...payload, login: 'someone-else' }
assert.ok(!ed25519.verify(hexToBytes(sig), new TextEncoder().encode(stableStringify(forged)), pub))

// Badge and country mapping.
assert.match(makeMiniBadgeSvg({ grade: 'A', score: 72.44, login: 'x' }), /A · 72\.4/)
assert.match(makeBadgeSvg({ grade: 'S', score: 88.04, login: 'x' }), /88\.0/)
assert.equal(makeBadgeSvg({ grade: 'zz', score: 5, login: 'x' }).includes('Unrated'.toUpperCase()), true)
assert.equal(makeBadgeSvg({ grade: 'A', score: 1, login: '<script>' }).includes('<script>'), false)
assert.equal(makeMiniBadgeSvg({ grade: 'A', score: 1, login: '<script>' }).includes('<script>'), false)
assert.equal(countryFromLocation('Aurangabad, Maharashtra').country, 'India')
assert.equal(countryFromLocation('Berlin').country, 'Germany')
assert.equal(countryFromLocation('Pune, IN').country, 'India')
assert.equal(countryFromLocation('the moon').country, null)
assert.equal(countryFromLocation('Indiana').country, null)

console.log('All score, signature, badge and country checks passed.')

{
  const t0 = '2026-11-07T10:00:00.000Z'
  const remote = { entries: [{ login: 'a', score: 40, issuedAt: '2026-11-07T10:05:00Z' }, { login: 'b', score: 60, issuedAt: '2026-10-01T00:00:00Z' }] }
  const local = { entries: [{ login: 'a', score: 10, issuedAt: '2026-11-01T00:00:00Z' }, { login: 'c', score: 50, issuedAt: '2026-11-07T10:01:00Z' }] }
  const m = mergeIndex(remote, local, t0)
  assert.deepEqual(m.entries.map((e) => e.login), ['b', 'c', 'a'], 'keeps others\' work, adds ours, never overwrites a newer entry with an old copy')
  const now = Date.parse('2026-11-07T00:00:00Z')
  const idx = { entries: [
    { login: 'old', issuedAt: '2026-10-01T00:00:00Z' },
    { login: 'older', issuedAt: '2026-09-01T00:00:00Z' },
    { login: 'fresh', issuedAt: '2026-11-06T00:00:00Z' },
    { login: 'gone', issuedAt: '2026-08-01T00:00:00Z', refreshFailedAt: '2026-11-01T00:00:00Z' },
  ] }
  assert.deepEqual(pickStale(idx, { now, batch: 5 }), ['older', 'old'], 'oldest first, skips fresh and recently failed')
  assert.deepEqual(pickStale(idx, { now, batch: 1 }), ['older'])
}
console.log('Refresh picking and index merging checks passed.')
