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

// Where a person's data lives. "profile" means the OSS Proof app wrote it into their own <login>/<login> repository.
export const PROFILE_DIR = '.oss-proof'
export const APP_SLUG = (import.meta.env.VITE_GH_APP_SLUG || '').trim()
export const installAppUrl = APP_SLUG ? `https://github.com/apps/${APP_SLUG}/installations/new` : ''
export const profileRaw = (login, ref = 'HEAD') => `https://raw.githubusercontent.com/${login}/${login}/${ref}/${PROFILE_DIR}`
export const profileBlob = (login, file) => `https://github.com/${login}/${login}/blob/HEAD/${PROFILE_DIR}/${file}`

export const badgeFile = (mini, theme) => (mini ? 'badge-mini.svg' : theme && theme !== 'grade' ? `badge.${theme}.svg` : 'badge.svg')
export const badgeUrl = (login, mini = false, theme = 'grade', store = 'central') =>
  store === 'profile'
    ? `${profileRaw(login)}/${badgeFile(mini, theme)}`
    : `${RAW_BASE}/badges/${login.toLowerCase()}${mini ? '-mini' : theme && theme !== 'grade' ? `.${theme}` : ''}.svg`
export const certificateLink = (login) => `${SITE_URL}#/verify/${login}`

// Shown in the footer so GitHub users can reach the maintainer. Set the repository variable SUPPORT_EMAIL.
export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || ''
export const SUPPORT_URL = SUPPORT_EMAIL ? `mailto:${SUPPORT_EMAIL}` : `${REPO_URL}/issues`
