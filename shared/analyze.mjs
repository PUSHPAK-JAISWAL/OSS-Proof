import { LIMITS, SCORING_VERSION } from './config.mjs'
import { countryFromLocation } from './country.mjs'
import { scoreEvidence } from './score.mjs'

const LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/
export const isValidLogin = (s) => LOGIN_RE.test(String(s || ''))

const EXTERNAL = new Set(['CONTRIBUTOR', 'FIRST_TIME_CONTRIBUTOR', 'FIRST_TIMER', 'NONE'])
const TEAM = new Set(['MEMBER', 'COLLABORATOR'])

function classify(association) {
  if (EXTERNAL.has(association)) return 'external'
  if (TEAM.has(association)) return 'team'
  return null // OWNER and anything unknown: not counted
}

function parseRepo(repositoryUrl) {
  const m = String(repositoryUrl).match(/\/repos\/([^/]+)\/([^/]+)$/)
  return m ? { owner: m[1], name: m[2], full: `${m[1]}/${m[2]}` } : null
}

/**
 * Reads public GitHub data and returns the evidence, the score and everything a certificate shows.
 * api(path) must return parsed JSON for a GitHub REST path such as "/users/octocat".
 * mode: "anonymous" | "token" | "certificate" picks how many requests we spend.
 */
export async function analyzeUser(login, { api, mode = 'anonymous', now = new Date(), onProgress = () => {} }) {
  if (!isValidLogin(login)) throw new Error('That is not a valid GitHub username.')
  const limits = LIMITS[mode] || LIMITS.anonymous
  const me = login.toLowerCase()

  onProgress('Reading profile')
  const user = await api(`/users/${login}`)
  if (user.type !== 'User') throw new Error('Only personal GitHub accounts can be graded.')
  onProgress('Finding organisations')
  const orgs = await api(`/users/${login}/orgs`)
  const orgNames = new Set(orgs.map((o) => o.login.toLowerCase()))

  // 1. Every merged PR the user opened outside repos they own. Search is capped at 1,000 results.
  onProgress('Searching merged pull requests')
  const found = []
  let totalMerged = 0
  for (let page = 1; page <= limits.searchPages; page++) {
    const q = encodeURIComponent(`type:pr author:${login} is:merged -user:${login}`)
    const res = await api(`/search/issues?q=${q}&sort=updated&order=desc&per_page=100&page=${page}`)
    totalMerged = res.total_count
    found.push(...res.items)
    if (res.items.length < 100) break
  }

  // 2. Drop personal and org-owned repos that the user controls, keep the rest.
  const candidates = []
  for (const it of found) {
    const repo = parseRepo(it.repository_url)
    if (!repo || repo.owner.toLowerCase() === me) continue
    const cls = classify(it.author_association)
    if (!cls) continue
    // A repo inside an org the user belongs to counts as team work even if GitHub says CONTRIBUTOR.
    const finalClass = orgNames.has(repo.owner.toLowerCase()) ? 'team' : cls
    candidates.push({ it, repo, cls: finalClass })
  }

  // 3. Pick which repos to look up: most PRs first, then most recent.
  const byRepo = new Map()
  for (const c of candidates) {
    const key = c.repo.full.toLowerCase()
    const entry = byRepo.get(key) || { repo: c.repo, count: 0, latest: 0 }
    entry.count++
    entry.latest = Math.max(entry.latest, Date.parse(c.it.pull_request?.merged_at || c.it.closed_at || 0))
    byRepo.set(key, entry)
  }
  const repoOrder = [...byRepo.values()].sort((a, b) => b.count - a.count || b.latest - a.latest).slice(0, limits.repos)

  let partial = false
  const repoInfo = new Map()
  let done = 0
  for (const entry of repoOrder) {
    onProgress(`Reading repositories (${++done}/${repoOrder.length})`)
    try {
      const r = await api(`/repos/${entry.repo.full}`)
      repoInfo.set(entry.repo.full.toLowerCase(), {
        stars: r.stargazers_count || 0,
        language: r.language || null,
        archived: !!r.archived,
        fork: !!r.fork,
        full: r.full_name,
      })
    } catch (err) {
      if (err.rateLimited) { partial = true; break }
      // A deleted or private repo cannot be verified, so it is simply not counted.
    }
  }

  // 4. Verify the highest-weight PRs: who merged them?
  const known = candidates
    .filter((c) => repoInfo.has(c.repo.full.toLowerCase()))
    .map((c) => ({ ...c, info: repoInfo.get(c.repo.full.toLowerCase()) }))
    .sort((a, b) => b.info.stars - a.info.stars || Date.parse(b.it.closed_at) - Date.parse(a.it.closed_at))
  // One PR per project first (busiest repos first), then the rest, so every project gets checked.
  const seen = new Map()
  const firsts = []
  const rest = []
  for (const c of known) {
    const k = c.repo.full.toLowerCase()
    if (seen.has(k)) rest.push(c)
    else { seen.set(k, true); firsts.push(c) }
  }
  const sample = [...firsts, ...rest].slice(0, limits.prs)

  const evidence = []
  let selfMerged = 0
  let unverifiable = 0
  let n = 0
  for (const c of sample) {
    onProgress(`Checking who merged each pull request (${++n}/${sample.length})`)
    try {
      const prPath = new URL(c.it.pull_request.url).pathname
      const pr = await api(prPath)
      const mergedBy = pr.merged_by?.login || null
      if (!pr.merged || !mergedBy) {
        unverifiable++
        continue
      }
      if (mergedBy.toLowerCase() === me) {
        selfMerged++
        continue
      }
      evidence.push({
        repo: c.info.full,
        stars: c.info.stars,
        language: c.info.language,
        class: c.cls,
        lines: (pr.additions || 0) + (pr.deletions || 0),
        botMerged: pr.merged_by?.type === 'Bot',
        mergedBy,
        number: pr.number,
        title: String(c.it.title || '').slice(0, 120),
        url: c.it.html_url,
        mergedAt: pr.merged_at,
      })
    } catch (err) {
      if (err.rateLimited) { partial = true; break }
      unverifiable++
    }
  }

  // Projects the search found but that we could not check (no budget left): still shown, clearly marked.
  const checked = new Set(evidence.map((e) => e.repo.toLowerCase()))
  const unchecked = [...byRepo.values()]
    .filter((e) => !checked.has(e.repo.full.toLowerCase()))
    .sort((a, b) => b.count - a.count)
    .slice(0, 40)
    .map((e) => ({ repo: e.repo.full, prs: e.count }))
  if (partial && evidence.length === 0) throw Object.assign(new Error('GitHub rate limit reached before anything could be checked. Add your own token above, or try again in an hour.'), { rateLimited: true })

  return buildResult({
    mode,
    now,
    user: { login: user.login, id: user.id, name: user.name, avatarUrl: user.avatar_url, profileUrl: user.html_url, location: user.location, createdAt: user.created_at },
    orgs: orgs.length,
    evidence,
    selfMerged,
    sampled: sample.length,
    unverifiable,
    full: mode === 'certificate',
    mergedFound: totalMerged,
    outsideOwn: candidates.length,
    foundProjects: byRepo.size,
    unchecked,
    partial,
  })
}

/** Turns verified evidence into the result object that certificates and the UI share. */
export function buildResult({ mode, now, user, profile = null, activity = null, full = false, orgs, evidence, selfMerged, sampled, unverifiable, mergedFound, outsideOwn, truncated = false, foundProjects = 0, unchecked = [], partial = false, restrictedOrgs = [], readErrors = 0 }) {
  const scored = scoreEvidence(evidence, { now, accountCreatedAt: user.createdAt, selfMerged, sampled })

  // Languages: weight each counted PR by its repo weight, so one popular repo outweighs ten tiny ones.
  const langWeight = new Map()
  for (const pr of evidence) {
    if (!pr.language) continue
    langWeight.set(pr.language, (langWeight.get(pr.language) || 0) + Math.log10(pr.stars + 10))
  }
  const languages = [...langWeight.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, full ? 12 : 6)
    .map(([name, w]) => ({ name, weight: Math.round(w * 10) / 10 }))

  const lastMergedAt = evidence.map((p) => p.mergedAt).sort().pop() || null
  const { country, code } = countryFromLocation(user.location)

  const top = [...evidence]
    .sort((a, b) => b.stars - a.stars || Date.parse(b.mergedAt) - Date.parse(a.mergedAt))
    .slice(0, 15)
    .map(({ repo, stars, language, class: cls, number, title, url, mergedAt, mergedBy, lines }) => ({
      repo, stars, language, class: cls, number, title, url, mergedAt, mergedBy, lines,
    }))

  // One line per repository: what the developer did in each project, not just how many PRs.
  const perRepo = new Map()
  for (const pr of evidence) {
    const k = pr.repo.toLowerCase()
    const r = perRepo.get(k) || { repo: pr.repo, stars: pr.stars, language: pr.language, class: pr.class, prs: 0, lines: 0, first: pr.mergedAt, last: pr.mergedAt, ...(pr.ownerType ? { ownerType: pr.ownerType, description: pr.description, license: pr.license, forks: pr.forks } : {}) }
    r.prs++
    if (full) (r.list ||= []).push({ number: pr.number, title: String(pr.title || '').slice(0, 100), url: pr.url, mergedAt: pr.mergedAt, mergedBy: pr.mergedBy, lines: pr.lines })
    r.lines += pr.lines || 0
    if (pr.mergedAt < r.first) r.first = pr.mergedAt
    if (pr.mergedAt > r.last) r.last = pr.mergedAt
    perRepo.set(k, r)
  }
  const repos = [...perRepo.values()].sort((a, b) => b.stars - a.stars || b.prs - a.prs).slice(0, full ? 300 : 40)
  if (full) for (const r of repos) r.list = (r.list || []).sort((a, b) => b.mergedAt.localeCompare(a.mergedAt)).slice(0, 30)

  // Merged PRs per month for the last 24 months, oldest first, so the shape of the activity is visible.
  const nowD = new Date(now)
  const timeline = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(Date.UTC(nowD.getUTCFullYear(), nowD.getUTCMonth() - (23 - i), 1))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    return { month: key, prs: evidence.filter((p) => String(p.mergedAt).slice(0, 7) === key).length }
  })

  // What the work looked like: size, speed, and how many different maintainers accepted it.
  const days = evidence.filter((p) => p.createdAt && p.mergedAt).map((p) => (Date.parse(p.mergedAt) - Date.parse(p.createdAt)) / 864e5).sort((a, b) => a - b)
  const sum = (f) => evidence.reduce((n, p) => n + (f(p) || 0), 0)
  const stats = {
    additions: sum((p) => p.additions ?? p.lines),
    deletions: sum((p) => p.deletions),
    filesChanged: sum((p) => p.files),
    medianDaysToMerge: days.length ? Math.round(days[Math.floor(days.length / 2)] * 10) / 10 : null,
    maintainers: new Set(evidence.map((p) => String(p.mergedBy).toLowerCase())).size,
    orgProjects: [...perRepo.values()].filter((r) => r.ownerType === 'Organization').length,
    userProjects: [...perRepo.values()].filter((r) => r.ownerType === 'User').length,
    licenses: [...new Set([...perRepo.values()].map((r) => r.license).filter(Boolean))].slice(0, 8),
  }

  return {
    schema: 1,
    scoringVersion: SCORING_VERSION,
    mode,
    login: user.login,
    githubId: user.id,
    name: user.name || null,
    avatarUrl: user.avatarUrl,
    profileUrl: user.profileUrl,
    location: user.location || null,
    profile,
    activity,
    country,
    countryCode: code,
    accountCreatedAt: user.createdAt,
    issuedAt: new Date(now).toISOString(),
    score: scored.score,
    grade: scored.grade,
    gradeLabel: scored.gradeLabel,
    breakdown: scored.breakdown,
    counts: {
      mergedFound,
      outsideOwnRepos: outsideOwn,
      sampled,
      counted: evidence.length,
      selfMerged,
      unverifiable,
      repos: scored.distinctRepos,
      activeMonths24: scored.activeMonths24,
      orgs,
      truncated,
      foundProjects: Math.max(foundProjects, scored.distinctRepos),
      partial: partial || readErrors > 0,
    },
    languages,
    lastMergedAt,
    repos,
    unchecked,
    restrictedOrgs,
    timeline,
    stats,
    evidence: top,
  }
}

export function summarize(result) {
  return {
    login: result.login,
    name: result.name,
    avatarUrl: result.avatarUrl,
    score: result.score,
    grade: result.grade,
    country: result.country,
    languages: result.languages.slice(0, 3).map((l) => l.name),
    lastMergedAt: result.lastMergedAt,
    issuedAt: result.issuedAt,
    counted: result.counts.counted,
    projects: result.counts.repos,
  }
}
