// Commits everything changed under data/ through GitHub's GraphQL API. GitHub signs commits made this way
// with its own key, so they show as Verified and were authored by github-actions[bot]. No secrets needed.
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { mergeIndex } from '../shared/mergeindex.mjs'

const { GH_TOKEN, REPO, BRANCH, MESSAGE, RUN_START } = process.env
if (!GH_TOKEN || !REPO || !BRANCH) throw new Error('GH_TOKEN, REPO and BRANCH are required')

const changed = execSync('git status --porcelain --untracked-files=all data', { encoding: 'utf8' })
  .split('\n').filter(Boolean).map((l) => l.slice(3).trim().replace(/^"|"$/g, ''))
  .filter((f) => !f.endsWith('.gitkeep'))
if (!changed.length) { console.log('Nothing to commit.'); process.exit(0) }

const localIndex = changed.includes('data/index.json') ? JSON.parse(readFileSync('data/index.json', 'utf8')) : null

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
const INDEX_Q = `query($owner:String!,$name:String!,$expr:String!){repository(owner:$owner,name:$name){object(expression:$expr){... on Blob{text}}}}`

// Other runs may have changed index.json since we checked out, so merge into whatever is on the branch now.
async function files() {
  return Promise.all(changed.map(async (path) => {
    if (path !== 'data/index.json') return { path, contents: readFileSync(path).toString('base64') }
    const t = (await gql(INDEX_Q, { owner, name, expr: `${BRANCH}:data/index.json` })).repository.object?.text
    const merged = mergeIndex(t ? JSON.parse(t) : { entries: [] }, localIndex, RUN_START || '1970-01-01')
    return { path, contents: Buffer.from(JSON.stringify(merged, null, 1) + '\n').toString('base64') }
  }))
}

for (let attempt = 1; attempt <= 5; attempt++) {
  const head = (await gql(HEAD_Q, { owner, name, ref: `refs/heads/${BRANCH}` })).repository.ref.target.oid
  try {
    const out = await gql(COMMIT_M, {
      input: {
        branch: { repositoryNameWithOwner: REPO, branchName: BRANCH },
        message: { headline: MESSAGE || 'Update certificates' },
        fileChanges: { additions: await files() },
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
