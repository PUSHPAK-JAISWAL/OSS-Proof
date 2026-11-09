# Setup: read token, GitHub App sign-in and the sign-in proxy

Three one-time jobs. A is required, B and C are optional but fix the rate-limit problem for visitors.

## A. `GH_READ_TOKEN` (required for certificates)

The Action's built-in `GITHUB_TOKEN` can only see this repository. When it searched for someone's pull requests it found nothing, so certificates came out as 0.0. Certificates must read with a real account's token.

1. GitHub > your avatar > **Settings** > **Developer settings** > **Personal access tokens** > **Fine-grained tokens** > **Generate new token**.
2. Token name `oss-proof-read`. **Expiration: 365 days or less.** Some organizations refuse fine-grained tokens that live longer than 366 days, and a pull request into one of them then cannot be read (this really happened: the grade came out too low). Set a calendar reminder to renew it.
3. **Resource owner**: your account. **Repository access**: **Public repositories (read-only)**.
4. Leave every permission empty. Public data needs none. Generate and copy the token.
5. In this repository: **Settings** > **Secrets and variables** > **Actions** > **Secrets** > **New repository secret**. Name `GH_READ_TOKEN`, paste the token.

It gives 5,000 requests an hour, shared by every certificate and refresh. If it ever runs out, the daily refresh stops early and continues the next day, and a certificate request fails with a clear message instead of issuing a wrong grade.

## B. A GitHub App for "Sign in with GitHub"

This lets a visitor sign in once and read all of their own pull requests with their own 5,000 requests an hour, instead of the 60 an hour anonymous limit.

1. **Settings** > **Developer settings** > **GitHub Apps** > **New GitHub App**.
2. **GitHub App name**: `OSS Proof` (names are global, so add something unique if it is taken).
3. **Homepage URL**: `https://<your-username>.github.io/OSS-Proof/`
4. **Callback URL**: exactly `https://<your-username>.github.io/OSS-Proof/` (with the trailing slash, no `#`). The redirect sign-in returns here.
5. **Expire user authorization tokens**: leave ticked.
6. **Request user authorization (OAuth) during installation**: leave unticked.
7. **Enable Device Flow**: **tick it**. This is the important one.
8. **Webhook** > **Active**: untick.
9. **Permissions**: leave all empty for now. Public data needs none.
10. **Where can this GitHub App be installed?**: **Any account**.
11. **Create GitHub App**. On the next page copy the **Client ID** (starts with `Iv`).
12. For the one-click sign-in (recommended), click **Generate a new client secret** and copy it now, since GitHub shows it once. It goes only into the Cloudflare worker as a *Secret*, never into this repository. Without it the site falls back to typing a code. You never need a private key.

## C. The sign-in proxy (Cloudflare Worker, free)

GitHub's login endpoints do not allow calls from a web page (no CORS), so a tiny forwarder is needed. It holds no secret and stores nothing. It only forwards two calls, only for your Client ID, only from your site.

1. Make a free account at cloudflare.com > **Workers & Pages** > **Create** > **Create Worker** > name it `oss-proof-auth` > **Deploy**.
2. **Edit code**, replace everything with the contents of `worker/github-proxy.js` from this repository, **Deploy**.
3. Worker > **Settings** > **Variables and Secrets** > add two plain variables, and one secret:
   - `CLIENT_ID` = the Client ID from step B11
   - `ALLOWED_ORIGIN` = `https://<your-username>.github.io` (no path, no trailing slash)
   - `CLIENT_SECRET` = the client secret from B12, type **Secret** (optional, but it turns on the redirect sign-in and stay-signed-in)
4. Open the worker's address in a browser. You should see `{ "ok": true, "clientIdSet": true, "secretSet": true, "allowedOrigins": ["https://<you>.github.io"] }`. If `allowedOrigins` is empty or wrong, fix `ALLOWED_ORIGIN`.
5. Copy the worker URL, for example `https://oss-proof-auth.<you>.workers.dev`.
6. In this repository: **Settings** > **Secrets and variables** > **Actions** > **Variables** > **New repository variable**:
   - `GH_APP_CLIENT_ID` = the Client ID
   - `AUTH_URL` = the worker URL
7. **Actions** > **Deploy to GitHub Pages** > **Run workflow**. The Check page now shows **Sign in with GitHub**.

Until B and C are done, the Check page keeps the paste-a-token box, so nothing breaks.

## How sign-in behaves

- **No installation.** Visitors only *authorize* the app once. Nothing is installed on their account or repositories.
- **Once, then automatic.** After the first approval GitHub skips its consent screen, and the site renews the session by itself (the token lasts 8 hours, the refresh token about 6 months), so returning visitors are already signed in.
- **Why the app asks for no permissions.** A token only has the power the app requests. With none, a stolen token can read only public data, which anyone can read. Asking for more (for example, writing to a profile repository) would make tokens more powerful and would need more care.
- **The badge does not use the visitor's token.** Certificates are built by the Action with `GH_READ_TOKEN`. Sign-in only makes the website's own check complete and fast.

## What I could not test (sign-in)

Sign-in, the proxy and the read token need your credentials, so none of them were run end to end. First run, check: sign in on the Check page and confirm the status line says it is reading every pull request; then request a certificate and confirm it shows your real project count.

## D. Store each person's data in their own profile repository (optional)

With this on, a certificate and its badges are written by your GitHub App into the person's own `<login>/<login>` repository, in a `.oss-proof` folder. Your repository then only keeps the small leaderboard index, reads use the installation's own rate limit, and nothing grows in your history. Anyone who has not installed the app keeps working exactly as before, stored in this repository.

Because a person owns their own repository and could edit a file there, profile certificates **must be signed**. The site refuses an unsigned one. So this needs the signing key too.

1. **Signing key.** Run `npm run keygen` on your computer. Commit the changed `src/lib/pubkey.json`. Put the private line it prints into a repository **secret** named `CERT_SIGNING_KEY`.
2. **App permission.** Open your GitHub App, **Permissions and events** > **Repository permissions** > **Contents**: **Read and write**. Save. (Metadata read-only is added for you.) Also confirm **Where can this GitHub App be installed?** is **Any account**.
3. **Private key.** On the same App page, **General** > **Private keys** > **Generate a private key**. A `.pem` file downloads.
4. **Repository secrets and variables** (Settings > Secrets and variables > Actions):
   - Secret `GH_APP_PRIVATE_KEY`: paste the full text of the `.pem` file, including the BEGIN and END lines.
   - Variable (or secret) `GH_APP_ID`: the **App ID** number at the top of the App page.
   - Variable (or secret) `GH_APP_SLUG`: the last part of the app's address, `https://github.com/apps/<slug>`.
5. Run **Deploy to GitHub Pages** once so the site learns the slug and shows the optional "Install on my profile repo" step.

How a person uses it: press the install button, choose **Only select repositories**, pick their profile repository, then open the certificate request as usual. The reply on the issue says where their files went.

If something is missing the workflow says so in its log and falls back to this repository. It never fails because of it.

## What I could not test

The app login, token and commit code are covered by `npm test` with fake responses. The real calls to GitHub need your App, so check once end to end: install the app on your own profile repository, request a certificate, then look for `.oss-proof/certificate.json` in `<you>/<you>` with the app's bot as the author.
