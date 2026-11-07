// Scoring rules, version 1.2.0. Anything that changes a number below must bump SCORING_VERSION.
export const SCORING_VERSION = '1.2.0'

export const SCORING = {
  // Points available per component. They add up to 100.
  points: { impact: 50, breadth: 20, consistency: 20, trust: 10 },
  // Impact: 50 * (1 - exp(-sum of PR weights / impactScale))
  impactScale: 45,
  // Breadth: 20 * (1 - exp(-distinct repos / breadthScale))
  breadthScale: 8,
  // Consistency: months (of the last 24) with at least one counted PR, full marks at this many
  consistencyFullMonths: 18,
  // Trust: full marks for an account this many years old
  trustFullYears: 4,
  // Repo weight = clamp(log10(stars + 10), 1, 5)
  repoWeightMin: 1,
  repoWeightMax: 5,
  // PR multipliers
  classFactor: { external: 1, team: 0.6 },
  botMergedFactor: 0.5,
  tinyFactor: 0.3,
  tinyLines: 5,
  // Inside one repository each further PR counts a little less, so the number of projects matters more than the number of PRs.
  repoDecay: 0.6,
  repoDecayFloor: 0.1,
}

// Tough on purpose. A score of 85 needs dozens of merged PRs across many well-used repos for 18+ months.
export const GRADES = [
  { grade: 'S', min: 85, label: 'Exceptional' },
  { grade: 'A', min: 70, label: 'Strong' },
  { grade: 'B', min: 50, label: 'Solid' },
  { grade: 'C', min: 30, label: 'Emerging' },
  { grade: 'D', min: 12, label: 'Started' },
  { grade: '-', min: 0, label: 'Unrated' },
]

// How many PRs and repos we look at per run. The signed certificate run has a bigger token budget.
export const LIMITS = {
  anonymous: { searchPages: 3, repos: 28, prs: 28 },
  token: { searchPages: 3, repos: 60, prs: 60 },
  certificate: { searchPages: 3, repos: 80, prs: 80 },
  // GraphQL reads the merger with the PR, so nothing is sampled. maxPages x 100 is the cap.
  deep: { maxPages: 40 },
}
