import { LIMITS } from './config.mjs'
import { restrictedOrgsFrom } from './gqlerrors.mjs'
import { buildResult, isValidLogin } from './analyze.mjs'

const RL = 'rateLimit { cost remaining resetAt }'
// Everything about the person in ONE request, plus three cheap counts (total merged PRs, reviews given, issues opened).
const USER_Q = `query($login:String!,$qTotal:String!,$qRev:String!,$qIss:String!){ ${RL}
  user(login:$login){ login databaseId name avatarUrl url location createdAt bio company websiteUrl
    followers{ totalCount } following{ totalCount }
    repositories(privacy:PUBLIC, ownerAffiliations:OWNER){ totalCount }
    topOwn: repositories(privacy:PUBLIC, ownerAffiliations:OWNER, isFork:false, orderBy:{field:STARGAZERS,direction:DESC}, first:6){ nodes{ nameWithOwner stargazerCount description primaryLanguage{ name } } }
    ownLangs: repositories(privacy:PUBLIC, ownerAffiliations:OWNER, isFork:false, orderBy:{field:PUSHED_AT,direction:DESC}, first:100){ nodes{ stargazerCount primaryLanguage{ name color } languages(first:5, orderBy:{field:SIZE,direction:DESC}){ edges{ size node{ name color } } } } }
    organizations(first:100){ nodes{ login name avatarUrl } }
    contributionsCollection{ totalCommitContributions totalIssueContributions totalPullRequestContributions totalPullRequestReviewContributions restrictedContributionsCount } }
  total: search(query:$qTotal, type:ISSUE, first:1){ issueCount }
  reviews: search(query:$qRev, type:ISSUE, first:1){ issueCount }
  issues: search(query:$qIss, type:ISSUE, first:1){ issueCount } }`

// Only scalar fields and single objects below, never a nested list, so a page of 100 PRs costs one point.
const PRS_Q = `query($q:String!,$after:String){ ${RL} search(query:$q,type:ISSUE,first:100,after:$after){
  issueCount pageInfo{ hasNextPage endCursor }
  nodes{ ... on PullRequest { number title url createdAt mergedAt additions deletions changedFiles authorAssociation
    mergedBy{ __typename login }
    repository{ nameWithOwner description stargazerCount forkCount isArchived primaryLanguage{ name } licenseInfo{ spdxId } owner{ __typename login } } } } } }`

// Counts for many date windows in one request: one alias per window.
const countQuery = (n) => `query(${Array.from({ length: n }, (_, i) => `$q${i}:String!`).join(',')}){ ${RL} ${Array.from({ length: n }, (_, i) => `w${i}: search(query:$q${i}, type:ISSUE, first:1){ issueCount }`).join(' ')} }`

// Language breakdown for many repositories in one request. Names are checked before they are placed in the query text.
const SAFE = /^[A-Za-z0-9._-]+$/
const langQuery = (repos) => `query{ ${RL} ${repos.map(([o, n], i) => `r${i}: repository(owner:"${o}", name:"${n}"){ languages(first:5, orderBy:{field:SIZE,direction:DESC}){ edges{ size node{ name color } } } }`).join(' ')} }`
const LANG_BATCH = 30
const LANG_REPOS = 90

const EXTERNAL = new Set(['CONTRIBUTOR', 'FIRST_TIME_CONTRIBUTOR', 'FIRST_TIMER', 'NONE'])
const TEAM = new Set(['MEMBER', 'COLLABORATOR'])
const day = (d) => d.toISOString().slice(0, 10)
const addDays = (d, n) => new Date(d.getTime() + n * 864e5)
const SEARCH_CAP = 1000
const COUNT_BATCH = 25
const PARALLEL = 3

async function pool(items, n, fn) {
  const queue = [...items]
  await Promise.all(Array.from({ length: Math.min(n, queue.length) }, async () => { while (queue.length) await fn(queue.shift()) }))
}

/**
 * Reads every merged PR a user opened outside their own repositories, using GraphQL, and wastes nothing:
 *  1. one request returns the profile, activity counts and the TOTAL number of merged PRs;
 *  2. if the total fits in one search (1,000 results) that is one window, otherwise the history is cut into years,
 *     and any year that is still too big is halved, counting many windows per request;
 *  3. empty windows are skipped and neighbouring small ones are merged, so every page is as full as it can be;
 *  4. each PR arrives with who merged it, its size, time to merge and its repository's details, in the same page.
 * gql(query, variables) must return the "data" object of a GraphQL response.
 */
export async function analyzeDeep(login, { gql: rawGql, now = new Date(), maxPages = LIMITS.deep.maxPages, onProgress = () => {} }) {
  if (!isValidLogin(login)) throw new Error('That is not a valid GitHub username.')
  const me = login.toLowerCase()
  const api = { requests: 0, cost: 0, remaining: null, resetAt: null, partialErrors: 0 }
  const restricted = new Set()
  const gql = async (q, v) => {
    const d = await rawGql(q, v)
    api.requests++
    if (d?.__errors) { api.partialErrors += d.__errors.length; for (const o of restrictedOrgsFrom(d.__errors)) restricted.add(o) }
    if (d?.rateLimit) { api.cost += d.rateLimit.cost || 0; api.remaining = d.rateLimit.remaining; api.resetAt = d.rateLimit.resetAt }
    return d
  }
  const base = `author:${login} is:pr is:merged -user:${login}`

  onProgress('Reading profile and activity')
  const first = await gql(USER_Q, {
    login,
    qTotal: base,
    qRev: `type:pr reviewed-by:${login} -author:${login}`,
    qIss: `type:issue author:${login} -user:${login}`,
  })
  const user = first.user
  if (!user) throw new Error('Only personal GitHub accounts can be graded.')
  const orgNodes = user.organizations.nodes
  const orgNames = new Set(orgNodes.map((o) => o.login.toLowerCase()))
  const total = first.total?.issueCount ?? 0

  const seen = new Map() // PR url -> node, so overlapping windows never double count
  let pages = 0
  let truncated = false

  // ---- 2 and 3: plan the windows ------------------------------------------------------------
  const from0 = new Date(user.createdAt)
  const to0 = new Date(now)
  async function planWindows() {
    if (total === 0) return []
    if (total <= SEARCH_CAP) return [{ from: from0, to: to0, count: total }]
    let wins = []
    for (let y = from0.getUTCFullYear(); y <= to0.getUTCFullYear(); y++) {
      wins.push({ from: new Date(Math.max(from0, Date.UTC(y, 0, 1))), to: new Date(Math.min(to0, Date.UTC(y, 11, 31))) })
    }
    const done = []
    while (wins.length) {
      const next = []
      for (let i = 0; i < wins.length; i += COUNT_BATCH) {
        const chunk = wins.slice(i, i + COUNT_BATCH)
        onProgress(`Sizing ${chunk.length} date ranges`)
        const vars = Object.fromEntries(chunk.map((w, k) => [`q${k}`, `${base} merged:${day(w.from)}..${day(w.to)}`]))
        const res = await gql(countQuery(chunk.length), vars)
        chunk.forEach((w, k) => {
          const count = res[`w${k}`].issueCount
          const span = Math.round((w.to - w.from) / 864e5)
          if (count === 0) return
          if (count > SEARCH_CAP && span >= 1) {
            const mid = addDays(w.from, Math.floor(span / 2))
            next.push({ from: addDays(mid, 1), to: w.to }, { from: w.from, to: mid })
          } else {
            if (count > SEARCH_CAP) truncated = true // one single day with more than 1,000: GitHub will not show the rest
            done.push({ ...w, count })
          }
        })
      }
      wins = next
    }
    done.sort((a, b) => a.from - b.from)
    // Merge neighbours while they still fit in one search, so no page is left mostly empty.
    const merged = []
    for (const w of done) {
      const last = merged[merged.length - 1]
      if (last && last.count + w.count <= SEARCH_CAP) { last.to = w.to; last.count += w.count } else merged.push({ ...w })
    }
    return merged
  }

  const windows = await planWindows()

  // ---- read the pages ------------------------------------------------------------------------
  async function readWindow(w) {
    const q = `${base} merged:${day(w.from)}..${day(w.to)}`
    let after = null
    for (;;) {
      if (pages >= maxPages) { truncated = true; return }
      pages++
      onProgress(`Reading merged pull requests (page ${pages}, ${seen.size} found)`)
      const { search } = await gql(PRS_Q, { q, after })
      for (const n of search.nodes) if (n?.url) seen.set(n.url, n)
      if (!search.pageInfo.hasNextPage) return
      after = search.pageInfo.endCursor
    }
  }
  // Newest windows first, a few at a time, so a page limit only ever cuts the oldest history.
  await pool([...windows].reverse(), PARALLEL, readWindow)

  onProgress('Checking who merged each pull request')
  const evidence = []
  let selfMerged = 0
  let unverifiable = 0
  let outside = 0
  for (const pr of seen.values()) {
    const repo = pr.repository
    if (!repo || repo.owner.login.toLowerCase() === me) continue
    let cls = EXTERNAL.has(pr.authorAssociation) ? 'external' : TEAM.has(pr.authorAssociation) ? 'team' : null
    if (!cls) continue // OWNER and unknown: not counted
    if (orgNames.has(repo.owner.login.toLowerCase())) cls = 'team'
    outside++
    const merger = pr.mergedBy
    if (!merger?.login) {
      unverifiable++
      continue
    }
    if (merger.login.toLowerCase() === me) {
      selfMerged++
      continue
    }
    evidence.push({
      repo: repo.nameWithOwner,
      stars: repo.stargazerCount || 0,
      language: repo.primaryLanguage?.name || null,
      class: cls,
      lines: (pr.additions || 0) + (pr.deletions || 0),
      additions: pr.additions || 0,
      deletions: pr.deletions || 0,
      files: pr.changedFiles || 0,
      botMerged: merger.__typename === 'Bot',
      mergedBy: merger.login,
      number: pr.number,
      title: String(pr.title || '').slice(0, 120),
      url: pr.url,
      createdAt: pr.createdAt,
      mergedAt: pr.mergedAt,
      description: repo.description ? String(repo.description).slice(0, 140) : null,
      forks: repo.forkCount || 0,
      license: repo.licenseInfo?.spdxId || null,
      ownerType: repo.owner.__typename || null,
    })
  }

  // Every language, not just each project's main one: the breakdown of the projects contributed to (best known first).
  const repoLangs = new Map()
  try {
    const weight = new Map()
    for (const e of evidence) weight.set(e.repo, (weight.get(e.repo) || 0) + Math.log10((e.stars || 0) + 10))
    const wanted = [...weight.entries()].sort((a, b) => b[1] - a[1]).map(([r]) => r.split('/')).filter(([o, n]) => o && n && SAFE.test(o) && SAFE.test(n)).slice(0, LANG_REPOS)
    const chunks = []
    for (let i = 0; i < wanted.length; i += LANG_BATCH) chunks.push(wanted.slice(i, i + LANG_BATCH))
    if (chunks.length) onProgress(`Reading languages of ${wanted.length} projects`)
    await pool(chunks, 2, async (chunk) => {
      const res = await gql(langQuery(chunk), {})
      chunk.forEach(([o, n], i) => {
        const edges = res?.[`r${i}`]?.languages?.edges
        if (edges?.length) repoLangs.set(`${o}/${n}`, edges.map((x) => ({ name: x.node.name, color: x.node.color, size: x.size })))
      })
    })
  } catch (err) {
    if (err.rateLimited) throw err
    onProgress('Language breakdown unavailable, using each project’s main language')
  }
  const ownLangs = (user.ownLangs?.nodes || []).map((r) => ({
    stars: r.stargazerCount || 0,
    primary: r.primaryLanguage?.name || null,
    langs: (r.languages?.edges || []).map((x) => ({ name: x.node.name, color: x.node.color, size: x.size })),
  }))

  const cc = user.contributionsCollection || {}
  const result = buildResult({
    mode: 'deep',
    now,
    user: { login: user.login, id: user.databaseId, name: user.name, avatarUrl: user.avatarUrl, profileUrl: user.url, location: user.location, createdAt: user.createdAt },
    profile: {
      bio: user.bio || null, company: user.company || null, website: user.websiteUrl || null,
      followers: user.followers?.totalCount ?? null, following: user.following?.totalCount ?? null, publicRepos: user.repositories?.totalCount ?? null,
      orgs: orgNodes.slice(0, 12).map((o) => ({ login: o.login, name: o.name || null, avatarUrl: o.avatarUrl || null })),
      topOwn: (user.topOwn?.nodes || []).map((r) => ({ repo: r.nameWithOwner, stars: r.stargazerCount || 0, description: r.description ? String(r.description).slice(0, 140) : null, language: r.primaryLanguage?.name || null })),
    },
    activity: {
      commitsLastYear: cc.totalCommitContributions ?? null,
      prsLastYear: cc.totalPullRequestContributions ?? null,
      reviewsLastYear: cc.totalPullRequestReviewContributions ?? null,
      issuesLastYear: cc.totalIssueContributions ?? null,
      privateLastYear: cc.restrictedContributionsCount ?? null,
      reviewsGiven: first.reviews?.issueCount ?? null,
      issuesOpened: first.issues?.issueCount ?? null,
    },
    full: true,
    repoLangs,
    ownLangs,
    orgs: orgNames.size,
    evidence,
    selfMerged,
    sampled: outside,
    unverifiable,
    mergedFound: seen.size,
    outsideOwn: outside,
    truncated,
    restrictedOrgs: [...restricted],
    readErrors: api.partialErrors,
  })
  // How much of the person's GitHub allowance this read used. Not part of the certificate (not enumerable).
  Object.defineProperty(result, 'api', { value: api, enumerable: false })
  return result
}
