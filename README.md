# OSS Proof

Contribution certificates for open source developers. It shows how many open source projects accepted your work and what you did in each one, using only pull requests that other maintainers merged into repositories you do not own. You get a verifiable certificate and a badge for your profile README. It runs on GitHub Pages and stores everything as files in this repository: no database, no server.

## How it works

1. **Check a profile.** The React app reads public GitHub data in the browser and shows the score, its four parts, every project the developer contributed to, and the top merged pull requests. Add your own token for the deep read of every PR.
2. **Request a certificate.** Open a "Certificate request" issue. The workflow in `.github/workflows/certify.yml` grades the issue author (GitHub proves who they are, so no OAuth app is needed) and commits `data/certs/<user>.json`, `data/badges/<user>.svg`, `data/badges/<user>-mini.svg` and `data/index.json`. When it finishes it replies on the issue with README tags to copy and closes it.
3. **Verify.** `#/verify/<user>` shows the certificate and checks it.
4. **Pin.** Paste the Markdown or HTML from the issue reply (or the certificate page) into your profile README.

Requests run one at a time through the GitHub Actions queue, so a certificate can take a few minutes when many people ask at once. The workflow comments on the issue straight away to confirm the request arrived.

### Badges stay fresh by themselves

`.github/workflows/refresh.yml` runs every day at 03:17 UTC. It re-grades the oldest certificates (up to 100 a day, only those older than 6 days; it stops early if GitHub's rate limit is reached and carries on the next day) and rewrites the same files, so the badge link in a README never changes and always shows a recent grade. You can also run it by hand from the Actions tab and choose the batch size. Accounts that no longer exist are skipped and retried after 30 days. GitHub caches README images for a few minutes, so a new grade can take a little while to show.

Runs never overwrite each other: before committing, each run merges its entries into the `data/index.json` that is on the branch at that moment.

### How a certificate is verified

- **Keyless (default, nothing to set up).** The workflow commits the files through the GitHub API, so GitHub signs the commit and it shows as Verified, authored by `github-actions[bot]`. The certificate page asks GitHub for the latest commit on the file and checks both. Only people with write access to this repository could change a file any other way.
- **Ed25519 (optional).** For a signature that does not depend on GitHub, run `npm run keygen`, commit `src/lib/pubkey.json`, and add the private key as the secret `CERT_SIGNING_KEY`. When the secret exists, certificates are also signed with it and checked in the browser.

## Grading (scoring version 1.2.0)

Rules live in `shared/config.mjs` and `shared/score.mjs`. Change a number, bump `SCORING_VERSION`.

- The point is breadth: how many different open source projects accepted your work. Each further PR in the same project counts less (60% of the one before, never below 10%), so ten PRs in ten projects beat thirty in one.
- Counts a merged PR only if it is in a repo the user does not own and someone else merged it.
- Weight per PR is `log10(stars + 10)` clamped to 1 to 5. Team work counts 0.6, bot merges 0.5, PRs under 5 changed lines 0.3.
- 100 points: Impact 50, Breadth 20, Consistency 20, Trust 10.
- Grades: S 85, A 70, B 50, C 30, D 12.

Limits: only public activity is visible, the grade measures accepted PRs and not code quality, and country is the profile's free-text location.

## Set it up

Extra one-time steps (read token, GitHub App sign-in, sign-in proxy) are in [docs/SETUP.md](docs/SETUP.md). The read token is required: without it certificates cannot see anyone's pull requests. Section D there turns on optional storage in each person's own profile repository, written by the GitHub App, so nothing per-person grows in this repository.

1. Create a GitHub repository and push this project to `main`.
2. Nothing to generate: certificates work without a key. (Optional: see Ed25519 above.)
3. Settings > Pages > Source: **GitHub Actions**.
4. Settings > Actions > General > Workflow permissions: **Read and write**.
5. Push, or run the "Deploy to GitHub Pages" workflow by hand. It tests, builds and publishes the site with GitHub's official Pages actions. The site reads data from `raw.githubusercontent.com/<repo>/main/data`.
6. Optional: Settings > Secrets and variables > Actions > Variables > `SUPPORT_EMAIL`, shown on the site as the contact address.

If `main` is protected, allow the Actions bot to push or certificates cannot be committed.

## Develop

```bash
npm install
npm run dev     # http://localhost:5173, serves ./data locally
npm test        # scoring, signature, badge, country checks
node scripts/test-analyze.mjs   # analysis pipeline against a fake GitHub API
```

Design work uses the taste-skill. Install it once per checkout:

```bash
npx skills add Leonxlnx/taste-skill
```

Stack: Vite, React, Tailwind CSS v4, `@noble/curves` for the optional signatures. Dependabot keeps npm packages and GitHub Actions up to date weekly.
