# Troubleshooting

Read this when your grade is lower than you expected, the site shows **Unrated**, or your badge shows something different from the live check. Every case below is a normal way the grader works, not an error — the fix is either a small action on your side or a wait that solves itself.

Two facts explain almost every complaint:

- **Only public activity counts.** The grader only reads what anyone can see on GitHub without logging in. It never asks for access to your private data.
- **Only work accepted by someone else counts.** A pull request earns points only when all three are true: it was **merged**, the repository is **not owned by you**, and **someone other than you** pressed the merge button. Anything else is left out of the score.

## Why is my badge or certificate showing **Unrated**?

Grades run **S (85+), A (70+), B (50+), C (30+), D (12+)**. "**Unrated**" is what a score below 12 is called, which in practice means the certificate found little or nothing to grade. The most common reasons, roughly in order of how often they happen:

| Reason | Sign in your counts | What to do |
| --- | --- | --- |
| No merged PRs by someone else yet | "Merged PRs counted" is 0 | Land one maintainer-merged PR in a project you don't own, then request a new certificate. |
| Most merges were your own | "Merged by yourself (not counted)" is large | See [I keep merging my own pull requests](#i-keep-merging-my-own-pull-requests). |
| Work is mostly in your own repos | "Merged PRs found outside own repos" is 0 or low | See [I contribute mostly to my own repositories](#i-contribute-mostly-to-my-own-repositories). |
| Private or deleted work | Merged PRs exist but are not counted | See [My merged work does not appear at all](#my-merged-work-does-not-appear-at-all). |
| Repositories that could not be read | "Checked for who merged them" is lower than "Merged PRs found outside own repos" | See [Some repositories could not be checked](#some-repositories-could-not-be-checked). |
| Only a sample was checked | The page shows a "checked N of your M PRs…" note | See [The preview checked only some of my pull requests](#the-preview-checked-only-some-of-my-pull-requests). |
| Old badge | The Check page scores fine, the README badge is stale | See [My badge is older than the page](#my-badge-is-older-than-the-page). |

Keep in mind the grader looks for breadth: it counts the first pull request of each project at full weight, and each later one in the same project at 60% of the one before (never below 10%), so twenty PRs in one project score less than the same number spread over several projects. A bot pressing the merge button still counts as someone else, but at half weight. The score covers your whole public history; only one part — active months — looks at the last 24 months. Seeing "nothing counted means nothing earned, however old the account is" is normal for an account whose public, merged-by-others work is still ahead of it.

## I keep merging my own pull requests

**What happens.** Every pull request that you merged yourself is dropped from the score. Nothing is hidden — the results show a "Merged by yourself (not counted)" line — but those PRs earn no points. This is deliberate: the certificate is meant to prove that other developers reviewed and accepted your work, and self-merges prove the opposite.

**What to do.**

1. Open pull requests in repositories you do not own and let a maintainer there review and merge them. The review, not the merge button, is the valuable part.
2. In your own projects, hand the merge button to a teammate or co-maintainer once a change has been reviewed.
3. Prefer fewer, larger reviewed PRs over a stream of self-merged ones.

## I contribute mostly to my own repositories

**What happens.** Pull requests against repositories owned by your account are excluded from the search entirely — the grader searches "merged pull requests by you, outside your own repositories" using GitHub's own `-user:yourname` filter. Repositories owned by organizations you belong to still count, but at a reduced weight (about 60%), because a repository inside your own organization is team work rather than open-source outreach. A teammate pressing the merge button still counts as someone other than you there — the reduced weight reflects the org membership, not who merged.

**What to do.**

1. Spend a little regular time in **other people's** projects — a bug fix, a docs improvement, a small feature in any public project you already use.
2. A popular project carries more weight than a tiny one, but the weight is capped, so even the most popular project counts roughly five times a brand-new one — a handful of small merged PRs in unrelated projects can outweigh one giant PR in a giant repo.
3. If you also want your own projects to help your profile, invite collaborators and let them review and merge.

## Some repositories could not be checked

**What happens.** For each project the grader tries to read the repository's public details (stars, language, whether it is archived or a fork). A repository that is **deleted or private** returns nothing, and no PR inside it can be verified — those pull requests are simply not counted. Organizations with strict security policies can make repository data unreachable for outside tools the same way; the pull requests were real, but they cannot be proven from public data.

**What to do.**

1. Nothing is lost forever: if the repository becomes public again, the next certificate picks it up. Re-request a certificate or wait for the daily refresh (see [My badge is older than the page](#my-badge-is-older-than-the-page)).
2. If a lot of your work sits inside one locked-down organization, ask its admins whether a public fork of the relevant pieces is acceptable.
3. Expect this quietly in your counts: "Checked for who merged them" will be lower than "Merged PRs found outside own repos".

## My merged work does not appear at all

**What happens.** The certificate is built **only from public GitHub data**:

- Merged PRs in **private repositories** never appear in public search, so they never enter the score.
- A repository that went private later counts the same as one that no longer exists. Certificates are re-graded from today's public data, so a score can go down as well as up — the badge always shows the newest result.
- GitHub search caps at 1,000 results per query; the grader splits your history into date ranges to work around that, but activity that was never public at merge time is genuinely invisible.

This is a structural limit of any public-data certificate, and the certificate itself states it: *only public GitHub activity is visible.*

**What to do.**

1. Where the code can be public, mirror it: open equivalent pull requests in public forks or public projects and get them merged there.
2. Link your public GitHub profile to the places where the private work is described (a portfolio repo, a blog post) — humans reading your profile can follow that even though the certificate cannot.

## The preview checked only some of my pull requests

**What happens.** Without a token, the check runs as an anonymous GitHub user from your own browser and gets **60 API requests per hour** for your whole IP address; every other anonymous GitHub tool you use draws on the same allowance. It reads a small sample first — at least one pull request per project, popular projects before the rest — and clearly reports it with a note like "This quick preview checked N of your M PRs", plus a bigger warning if your history is long enough that whole projects went unchecked. The preview is a *taste*, not the grade.

**What to do.**

1. **Best:** request a signed certificate with the "Get certificate" button. The certificate run reads your public history page by page, every merged pull request; only an unusually long history can outgrow its page budget, and the page tells you when that happens.
2. Or paste a personal access token into the token box at the top of the check. It stays in your browser tab for this one request set, is only sent to api.github.com, and a fine-grained token with no permissions ticked is fine — public data needs no permissions. The preview then checks far more of your history immediately.

## My badge is older than the page

**What happens.** The Check page always runs a fresh live analysis, but a badge in your README only changes when a workflow rewrites it — either the certificate request you just filed (its run re-grades you and rebuilds the badge in the same commit) or the daily **Refresh certificates** workflow, which runs at 03:17 UTC, takes the oldest certificates first, up to about 25 per day, and only touches certificates older than 6 days — a freshly minted certificate does not need one. On top of that, GitHub caches README images for a few minutes, so even a just-rewritten badge can lag behind.

**What to do.**

1. Wait a few minutes and hard-reload the page with your README (Ctrl+Shift+R). The cache is the most likely culprit right after a fresh certificate.
2. Check the certificate date on the Verify page: if the workflow ran *today*, the badge will catch up on its own within minutes.
3. With no backlog, your certificate is re-graded about a week after it turns 6 days old; the queue is oldest first, so busy weeks can take a little longer. Requesting a fresh certificate rewrites the badge as soon as that run commits.
4. If the badge has disagreed with a live check for more than a week, check the workflow runs in the Actions tab; sustained failures are worth [an issue](https://github.com/PUSHPAK-JAISWAL/OSS-Proof/issues).

## Still stuck?

If the cases above do not explain what you see, [open an issue](https://github.com/PUSHPAK-JAISWAL/OSS-Proof/issues) with either the counts table from the Check page ("Merged PRs counted", "Merged by yourself") or the score line from your certificate, and someone will take a look. Background reading: [the README](../README.md) (how grading works) and [CONTRIBUTING.md](../CONTRIBUTING.md) (project etiquette).
