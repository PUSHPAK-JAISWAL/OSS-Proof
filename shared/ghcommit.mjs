// Commits files to any repository's default branch through GraphQL. GitHub signs commits made this way, and a commit
// made with an app's installation token is authored by the app's bot.
const COMMIT_M = `mutation($input:CreateCommitOnBranchInput!){createCommitOnBranch(input:$input){commit{oid url}}}`
const HEAD_Q = `query($owner:String!,$name:String!){repository(owner:$owner,name:$name){defaultBranchRef{name target{oid}}}}`

export async function commitFiles({ token, repo, message, files, fetchImpl = fetch, retries = 3 }) {
  const [owner, name] = repo.split('/')
  const gql = async (query, variables) => {
    const res = await fetchImpl('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'oss-proof' },
      body: JSON.stringify({ query, variables }),
    })
    const body = await res.json()
    if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join('; '))
    return body.data
  }
  let lastErr
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const ref = (await gql(HEAD_Q, { owner, name })).repository?.defaultBranchRef
      if (!ref) throw new Error(`${repo} has no commits yet. Create it with a README first.`)
      const out = await gql(COMMIT_M, {
        input: {
          branch: { repositoryNameWithOwner: repo, branchName: ref.name },
          message: { headline: message },
          fileChanges: { additions: files.map((f) => ({ path: f.path, contents: Buffer.from(f.contents).toString('base64') })) },
          expectedHeadOid: ref.target.oid,
        },
      })
      return out.createCommitOnBranch.commit.url
    } catch (err) {
      lastErr = err
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1000 * attempt))
    }
  }
  throw lastErr
}
