# Setup: read token, GitHub App sign-in and the sign-in proxy

Three one-time jobs. A is required, B and C are optional but fix the rate-limit problem for visitors.

## A. `GH_READ_TOKEN` (required for certificates)

The Action's built-in `GITHUB_TOKEN` can only see this repository. When it searched for someone's pull requests it found nothing, so certificates came out as 0.0. Certificates must read with a real account's token.

1. GitHub > your avatar > **Settings** > **Developer settings** > **Personal access tokens** > **Fine-grained tokens** > **Generate new token**.
2. Token name `oss-proof-read`. Expiration: the longest you are comfortable with (a calendar reminder to renew is wise).
3. **Resource owner**: your account. **Repository access**: **Public repositories (read-only)**.
4. Leave every permission empty. Public data needs none. Generate and copy the token.
5. In this repository: **Settings** > **Secrets and variables** > **Actions** > **Secrets** > **New repository secret**. Name `GH_READ_TOKEN`, paste the token.

It gives 5,000 requests an hour, shared by every certificate and refresh. If it ever runs out, the daily refresh stops early and continues the next day, and a certificate request fails with a clear message instead of issuing a wrong grade.

## B. A GitHub App for "Sign in with GitHub"

This lets a visitor sign in once and read all of their own pull requests with their own 5,000 requests an hour, instead of the 60 an hour anonymous limit.

1. **Settings** > **Developer settings** > **GitHub Apps** > **New GitHub App**.
2. **GitHub App name**: `OSS Proof` (names are global, so add something unique if it is taken).
3. **Homepage URL**: `https://<your-username>.github.io/OSS-Proof/`
4. **Callback URL**: the same URL. (The device flow does not use it, but the form wants one.)
5. **Expire user authorization tokens**: leave ticked.
6. **Request user authorization (OAuth) during installation**: leave unticked.
7. **Enable Device Flow**: **tick it**. This is the important one.
8. **Webhook** > **Active**: untick.
9. **Permissions**: leave all empty for now. Public data needs none.
10. **Where can this GitHub App be installed?**: **Any account**.
11. **Create GitHub App**. On the next page copy the **Client ID** (starts with `Iv`). Do **not** generate a client secret or a private key. Nothing here needs them.

## C. The sign-in proxy (Cloudflare Worker, free)

GitHub's login endpoints do not allow calls from a web page (no CORS), so a tiny forwarder is needed. It holds no secret and stores nothing. It only forwards two calls, only for your Client ID, only from your site.

1. Make a free account at cloudflare.com > **Workers & Pages** > **Create** > **Create Worker** > name it `oss-proof-auth` > **Deploy**.
2. **Edit code**, replace everything with the contents of `worker/github-proxy.js` from this repository, **Deploy**.
3. Worker > **Settings** > **Variables and Secrets** > add two plain variables:
   - `CLIENT_ID` = the Client ID from step B11
   - `ALLOWED_ORIGIN` = `https://<your-username>.github.io` (no path, no trailing slash)
4. Open the worker's address in a browser. You should see `{ "ok": true, "clientIdSet": true, "allowedOrigins": ["https://<you>.github.io"] }`. If `allowedOrigins` is empty or wrong, fix `ALLOWED_ORIGIN`.
5. Copy the worker URL, for example `https://oss-proof-auth.<you>.workers.dev`.
6. In this repository: **Settings** > **Secrets and variables** > **Actions** > **Variables** > **New repository variable**:
   - `GH_APP_CLIENT_ID` = the Client ID
   - `AUTH_URL` = the worker URL
7. **Actions** > **Deploy to GitHub Pages** > **Run workflow**. The Check page now shows **Sign in with GitHub**.

Until B and C are done, the Check page keeps the paste-a-token box, so nothing breaks.

## What I could not test

Sign-in, the proxy and the read token need your credentials, so none of them were run end to end. First run, check: sign in on the Check page and confirm the status line says it is reading every pull request; then request a certificate and confirm it shows your real project count.

## Later: certificates stored in each user's own profile repo

The idea of the app writing the certificate and a refresh workflow into each user's own `<login>/<login>` repository, so GitHub holds the data and each user's own quota pays for it, is possible with this same App by adding permissions **Contents: read and write** and **Workflows: read and write** and an install step. It changes the trust model, because a file in a user's own repo can be edited by that user, so a visitor would verify by re-reading live GitHub data instead of trusting a stored file. Say the word and it can be built as a second step once A to C work.
