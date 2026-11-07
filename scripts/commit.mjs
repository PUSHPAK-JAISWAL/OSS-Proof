// Commits everything changed under data/ through GitHub's GraphQL API. GitHub signs commits made this way
// with its own key, so they show as Verified and were authored by github-actions[bot]. No secrets needed.
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const { GH_TOKEN, REPO, BRANCH, MESSAGE } = process.env
if (!GH_TOKEN || !REPO || !BRANCH) throw new Error('GH_TOKEN, REPO and BRANCH are required')

const changed = execSync('git status --porcelain --untracked-files=all data', { encoding: 'utf8' })
  .split('\n').filter(Boolean).map((l) => l.slice(3).trim().replace(/^"|"$/g, ''))
  .filter((f) => !f.endsWith('.gitkeep'))
if (!changed.length) { console.log('Nothing to commit.'); process.exit(0) }

const additions = changed.map((path) => ({ path, contents: readFileSync(path).toString('base64') }))

async function gql(query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GH_TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'oss-proof-commit' },
    body: JSON.stringify({ query, variables }),
  })
  const body = await res.json()
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join('; '))
  return body.data
}

const HEAD_Q = `query($owner:String!,$name:String!,$ref:String!){repository(owner:$owner,name:$name){ref(qualifiedName:$ref){target{oid}}}}`
const COMMIT_M = `mutation($input:CreateCommitOnBranchInput!){createCommitOnBranch(input:$input){commit{oid url}}}`
const [owner, name] = REPO.split('/')

for (let attempt = 1; attempt <= 5; attempt++) {
  const head = (await gql(HEAD_Q, { owner, name, ref: `refs/heads/${BRANCH}` })).repository.ref.target.oid
  try {
    const out = await gql(COMMIT_M, {
      input: {
        branch: { repositoryNameWithOwner: REPO, branchName: BRANCH },
        message: { headline: MESSAGE || 'Update certificates' },
        fileChanges: { additions },
        expectedHeadOid: head,
      },
    })
    console.log(`Committed ${changed.length} file(s): ${out.createCommitOnBranch.commit.url}`)
    process.exit(0)
  } catch (err) {
    console.log(`Attempt ${attempt} failed: ${err.message}`)
    if (attempt === 5) throw err
    await new Promise((r) => setTimeout(r, 1500 * attempt))
  }
}
