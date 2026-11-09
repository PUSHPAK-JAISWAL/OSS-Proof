# Contributing to OSS Proof

Thanks for helping. This is a small project, so the rules are short.

## Run it

```bash
npm install
npm run dev     # http://localhost:5173, serves ./data locally
npm test        # scoring, signature, badge and country checks
node scripts/test-analyze.mjs
```

## Changing the grading

The scoring rules live in `shared/config.mjs` and `shared/score.mjs`. Every change that can move someone's score must:

1. Bump `SCORING_VERSION` in `shared/config.mjs`.
2. Update or add a check in `scripts/test-score.mjs`.
3. Explain in the pull request who gets a higher or lower grade because of it, and why that is fairer.

Open an issue first for large changes to the grading. It is the part people will argue about most.

## Pull requests

- Keep each pull request to one thing, and commit in small steps.
- `npm test` and `npm run build` must pass.
- For UI changes, add a screenshot and check light, dark, and a phone width. Motion must respect `prefers-reduced-motion`.
- Do not commit anything under `data/certs/`, `data/badges/` or `data/index.json`. The certificate workflow owns those files.
- Never commit a private key.

## Reporting problems

Use the issue templates. For security problems, see [SECURITY.md](SECURITY.md).

By contributing you agree that your work is released under the [MIT license](LICENSE) and that you will follow the [code of conduct](CODE_OF_CONDUCT.md).
