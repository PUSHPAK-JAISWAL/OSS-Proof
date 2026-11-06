import { GRADES, SCORING } from './config.mjs'

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))
const round1 = (n) => Math.round(n * 10) / 10

export function repoWeight(stars) {
  return clamp(Math.log10((stars || 0) + 10), SCORING.repoWeightMin, SCORING.repoWeightMax)
}

export function prWeight(pr) {
  let w = repoWeight(pr.stars) * (SCORING.classFactor[pr.class] ?? 0)
  if (pr.botMerged) w *= SCORING.botMergedFactor
  if (pr.lines < SCORING.tinyLines) w *= SCORING.tinyFactor
  return w
}

export function gradeFor(score) {
  return GRADES.find((g) => score >= g.min) || GRADES[GRADES.length - 1]
}

/**
 * evidence: counted PRs [{ repo, stars, class, lines, botMerged, mergedAt }]
 * context:  { accountCreatedAt, now, selfMerged, sampled }
 */
export function scoreEvidence(evidence, context) {
  const now = new Date(context.now || Date.now())
  const sumWeight = evidence.reduce((s, pr) => s + prWeight(pr), 0)
  const repos = new Set(evidence.map((pr) => pr.repo.toLowerCase()))

  const monthsSeen = new Set()
  const cutoff = new Date(now)
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 24)
  for (const pr of evidence) {
    const d = new Date(pr.mergedAt)
    if (d >= cutoff && d <= now) monthsSeen.add(`${d.getUTCFullYear()}-${d.getUTCMonth()}`)
  }

  const ageYears = Math.max(0, (now - new Date(context.accountCreatedAt)) / (365.25 * 864e5))
  const sampled = Math.max(1, context.sampled || evidence.length + (context.selfMerged || 0))
  const selfShare = (context.selfMerged || 0) / sampled
  const tinyShare = evidence.length ? evidence.filter((p) => p.lines < SCORING.tinyLines).length / evidence.length : 0
  const cleanliness = clamp(1 - selfShare, 0, 1) * (1 - 0.5 * tinyShare)

  const p = SCORING.points
  const breakdown = {
    impact: round1(p.impact * (1 - Math.exp(-sumWeight / SCORING.impactScale))),
    breadth: round1(p.breadth * (1 - Math.exp(-repos.size / SCORING.breadthScale))),
    consistency: round1(p.consistency * Math.min(1, monthsSeen.size / SCORING.consistencyFullMonths)),
    trust: round1(p.trust * Math.min(1, ageYears / SCORING.trustFullYears) * cleanliness),
  }
  // Nothing counted means nothing earned, however old the account is.
  const score = evidence.length === 0 ? 0 : round1(Object.values(breakdown).reduce((a, b) => a + b, 0))
  if (evidence.length === 0) for (const k of Object.keys(breakdown)) breakdown[k] = 0
  const g = gradeFor(score)
  return {
    score,
    grade: g.grade,
    gradeLabel: g.label,
    breakdown,
    activeMonths24: monthsSeen.size,
    distinctRepos: repos.size,
    sumWeight: round1(sumWeight),
  }
}
