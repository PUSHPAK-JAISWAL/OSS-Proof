import { LIMITS } from './config.mjs'
import { buildResult, isValidLogin } from './analyze.mjs'

const USER_Q = `query($login:String!){ user(login:$login){ login databaseId name avatarUrl url location createdAt organizations(first:100){ nodes{ login } } } }`
const PRS_Q = `query($q:String!,$after:String){ search(query:$q,type:ISSUE,first:100,after:$after){
  issueCount pageInfo{ hasNextPage endCursor }
  nodes{ ... on PullRequest { number title url mergedAt additions deletions authorAssociation
    mergedBy{ __typename login }
    repository{ nameWithOwner stargazerCount isArchived primaryLanguage{ name } owner{ login } } } } } }`

const EXTERNAL = new Set(['CONTRIBUTOR', 'FIRST_TIME_CONTRIBUTOR', 'FIRST_TIMER', 'NONE'])
const TEAM = new Set(['MEMBER', 'COLLABORATOR'])
const day = (d) => d.toISOString().slice(0, 10)
const addDays = (d, n) => new Date(d.getTime() + n * 864e5)

/**
 * Reads every merged PR a user opened outside their own repositories, using GraphQL. One request returns
 * 100 PRs with the person who merged each one, so nothing is sampled. GitHub search shows at most 1,000
 * results per query, so a busy history is split into date ranges until each part fits.
 * gql(query, variables) must return the "data" object of a GraphQL response.
 */
export async function analyzeDeep(login, { gql, now = new Date(), maxPages = LIMITS.deep.maxPages, onProgress = () => {} }) {
  if (!isValidLogin(login)) throw new Error('That is not a valid GitHub username.')
  const me = login.toLowerCase()

  onProgress('Reading profile')
  const { user } = await gql(USER_Q, { login })
  if (!user) throw new Error('Only personal GitHub accounts can be graded.')
  const orgNames = new Set(user.organizations.nodes.map((o) => o.login.toLowerCase()))

  const seen = new Map() // PR url -> node, so overlapping ranges never double count
  let pages = 0
  let truncated = false

  async function page(q, after) {
    if (pages >= maxPages) {
      truncated = true
      return null
    }
    pages++
    onProgress(`Reading merged pull requests (page ${pages}, ${seen.size} found)`)
    const data = await gql(PRS_Q, { q, after })
    return data.search
  }

  async function collect(from, to) {
    const q = `author:${login} is:pr is:merged -user:${login} merged:${day(from)}..${day(to)}`
    let res = await page(q, null)
    if (!res) return
    const span = Math.round((to - from) / 864e5)
    if (res.issueCount > 1000 && span >= 1) {
      // Too many for one query: newer half first, so recent work is read before any page limit bites.
      const mid = addDays(from, Math.floor(span / 2))
      await collect(addDays(mid, 1), to)
      await collect(from, mid)
      return
    }
    for (;;) {
      for (const n of res.nodes) if (n?.url) seen.set(n.url, n)
      if (!res.pageInfo.hasNextPage) break
      res = await page(q, res.pageInfo.endCursor)
      if (!res) break
    }
  }

  await collect(new Date(user.createdAt), new Date(now))

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
      botMerged: merger.__typename === 'Bot',
      mergedBy: merger.login,
      number: pr.number,
      title: String(pr.title || '').slice(0, 120),
      url: pr.url,
      mergedAt: pr.mergedAt,
    })
  }

  return buildResult({
    mode: 'deep',
    now,
    user: { login: user.login, id: user.databaseId, name: user.name, avatarUrl: user.avatarUrl, profileUrl: user.url, location: user.location, createdAt: user.createdAt },
    orgs: orgNames.size,
    evidence,
    selfMerged,
    sampled: outside,
    unverifiable,
    mergedFound: seen.size,
    outsideOwn: outside,
    truncated,
  })
}
