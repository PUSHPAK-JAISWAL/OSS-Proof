import pubkey from './pubkey.json'

// The deploy workflow sets VITE_REPO to "owner/repo". Locally it falls back to ./data served by Vite.
export const REPO = import.meta.env.VITE_REPO || ''
export const BRANCH = import.meta.env.VITE_BRANCH || 'main'
export const hasRepo = Boolean(REPO)

export const RAW_BASE = hasRepo ? `https://raw.githubusercontent.com/${REPO}/${BRANCH}/data` : '/data'

export const SITE_URL = hasRepo
  ? `https://${REPO.split('/')[0].toLowerCase()}.github.io/${REPO.split('/')[1]}/`
  : typeof location !== 'undefined'
    ? `${location.origin}${location.pathname}`
    : ''

export const REPO_URL = hasRepo ? `https://github.com/${REPO}` : 'https://github.com'
export const PUBLIC_KEY = pubkey.publicKey
export const KEY_ID = pubkey.keyId

// The workflow grades whoever opens the issue, so the link needs no username.
export const requestCertificateUrl = () => `${REPO_URL}/issues/new?template=certificate.yml&title=${encodeURIComponent('Certificate request')}`

export const badgeUrl = (login) => `${RAW_BASE}/badges/${login.toLowerCase()}.svg`
export const certificateLink = (login) => `${SITE_URL}#/verify/${login}`
