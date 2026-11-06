// Creates the Ed25519 key pair that signs certificates.
// The public key goes into src/lib/pubkey.json (commit it). The private key goes into a repository
// secret named CERT_SIGNING_KEY and is never written to disk.
import { ed25519 } from '@noble/curves/ed25519.js'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { bytesToHex } from '../shared/canonical.mjs'

const target = new URL('../src/lib/pubkey.json', import.meta.url)
const current = existsSync(target) ? JSON.parse(readFileSync(target, 'utf8')) : {}
if (current.publicKey && !process.argv.includes('--force')) {
  console.error('A public key is already set. Run with --force only if you want to replace it.')
  console.error('Replacing it makes every existing certificate fail verification.')
  process.exit(1)
}

const { secretKey, publicKey } = ed25519.keygen()
const pub = bytesToHex(publicKey)
writeFileSync(target, JSON.stringify({ publicKey: pub, keyId: pub.slice(0, 8) }, null, 2) + '\n')

console.log('Public key written to src/lib/pubkey.json. Commit that file.\n')
console.log('Private key (add as repository secret CERT_SIGNING_KEY, then clear your terminal):\n')
console.log(bytesToHex(secretKey))
console.log('\nGitHub: Settings > Secrets and variables > Actions > New repository secret')
