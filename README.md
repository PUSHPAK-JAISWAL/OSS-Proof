# OSS Proof

Contribution certificates for open source developers. It grades the pull requests that other maintainers merged into repositories you do not own, signs the result, and gives you a badge for your profile README. It runs on GitHub Pages and stores everything as files in this repository: no database, no server.

## How it works

1. **Check a profile.** The React app reads public GitHub data in the browser and shows the score, its four parts and every counted pull request.
2. **Request a certificate.** The user opens a "Certificate request" issue. The workflow in `.github/workflows/certify.yml` grades the issue author (GitHub proves who they are, so no OAuth app is needed), signs the result with Ed25519, and commits `data/certs/<user>.json`, `data/badges/<user>.svg` and `data/index.json`.
3. **Verify.** `#/verify/<user>` fetches the file and checks the signature in the browser against the public key in `src/lib/pubkey.json`.
4. **Pin.** The certificate page gives Markdown and HTML for the badge.

## Grading (scoring version 1.0.0)

Rules live in `shared/config.mjs` and `shared/score.mjs`. Change a number, bump `SCORING_VERSION`.

- Counts a merged PR only if it is in a repo the user does not own and someone else merged it.
- Weight per PR is `log10(stars + 10)` clamped to 1 to 5. Team work counts 0.6, bot merges 0.5, PRs under 5 changed lines 0.3.
- 100 points: Impact 50, Breadth 20, Consistency 20, Trust 10.
- Grades: S 85, A 70, B 50, C 30, D 12.

Limits: only public activity is visible, the grade measures accepted PRs and not code quality, country is the profile's free-text location, and the sample per run is capped (80 PRs for certificates).

## Set it up

1. Create a GitHub repository and push this project to `main`.
2. `npm install && npm run keygen`. Commit `src/lib/pubkey.json`. Add the printed private key as the repository secret `CERT_SIGNING_KEY`.
3. Settings > Actions > General > Workflow permissions: **Read and write**.
4. Push, or run the "Deploy to GitHub Pages" workflow by hand. It tests, builds and pushes the site to a `gh-pages` branch using plain git, so it needs no third-party actions.
5. Once the `gh-pages` branch exists: Settings > Pages > Source: **Deploy from a branch**, branch `gh-pages`, folder `/ (root)`. The site reads data from `raw.githubusercontent.com/<repo>/main/data`.
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

Stack: Vite, React, Tailwind CSS v4, `@noble/curves` for signatures.

## GitHub Developer Program

This project is built on the GitHub REST API: the browser app reads users, orgs, search, repos and pulls, and the certify workflow does the same server-side. To join the [Developer Program](https://github.com/developer/register) you need an integration using the API and a support email. Set the repository variable `SUPPORT_EMAIL` (Settings > Secrets and variables > Actions > Variables) and re-run the deploy workflow so the footer shows it.
