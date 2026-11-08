import assert from 'node:assert/strict'
import { createVerify, generateKeyPairSync } from 'node:crypto'
import { appJwt, profileAccess } from '../shared/appauth.mjs'
import { commitFiles } from '../shared/ghcommit.mjs'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } })

// The token must verify with the public half and carry the app id.
const jwt = appJwt(12345, privateKey, 1_700_000_000)
const [h, b, s] = jwt.split('.')
assert.ok(createVerify('RSA-SHA256').update(`${h}.${b}`).verify(publicKey, Buffer.from(s, 'base64url')))
assert.equal(JSON.parse(Buffer.from(b, 'base64url')).iss, '12345')
// A key pasted into a secret with literal \n sequences still works.
assert.ok(appJwt(1, privateKey.replace(/\n/g, '\\n')).split('.').length === 3)

const res = (status, json) => ({ status, ok: status >= 200 && status < 300, json: async () => json })
const calls = []
const mk = (inst, tok) => async (url, init) => {
  calls.push([url, init?.method || 'GET', init?.body])
  if (url.includes('/users/')) return inst
  return tok
}
assert.deepEqual(await profileAccess({ appId: 1, privateKey, login: 'a', fetchImpl: mk(res(404, {})) }), { reason: 'not-installed' })
assert.equal((await profileAccess({ appId: 1, privateKey, login: 'a', fetchImpl: mk(res(200, { id: 9 }), res(422, {})) })).reason, 'repo-not-granted')
const ok = await profileAccess({ appId: 1, privateKey, login: 'octo', fetchImpl: mk(res(200, { id: 9 }), res(201, { token: 'ghs_x' })) })
assert.equal(ok.token, 'ghs_x')
assert.deepEqual(JSON.parse(calls.at(-1)[2]), { repositories: ['octo'], permissions: { contents: 'write' } })
assert.equal((await profileAccess({ appId: 1, privateKey: 'garbage', login: 'a', fetchImpl: mk(res(200, {})) })).reason, 'error')

// Committing: reads the default branch, then writes against its head.
const seen = []
const gqlFetch = async (_u, init) => {
  const { query, variables } = JSON.parse(init.body)
  seen.push(variables)
  if (query.includes('defaultBranchRef')) return { json: async () => ({ data: { repository: { defaultBranchRef: { name: 'master', target: { oid: 'abc' } } } } }) }
  return { json: async () => ({ data: { createCommitOnBranch: { commit: { oid: '1', url: 'https://x/c/1' } } } }) }
}
const url = await commitFiles({ token: 't', repo: 'octo/octo', message: 'm', files: [{ path: '.oss-proof/certificate.json', contents: '{}' }], fetchImpl: gqlFetch })
assert.equal(url, 'https://x/c/1')
assert.equal(seen[1].input.branch.branchName, 'master')
assert.equal(seen[1].input.expectedHeadOid, 'abc')
assert.equal(seen[1].input.fileChanges.additions[0].contents, Buffer.from('{}').toString('base64'))
console.log('App auth and profile commit checks passed.')
