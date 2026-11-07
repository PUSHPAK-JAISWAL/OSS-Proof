/** Merges this run's entries into the index that is currently on the branch, so parallel runs never lose each other's work. */
export function mergeIndex(remote, local, since) {
  const touched = (local?.entries || []).filter((e) => e.issuedAt >= since || (e.refreshFailedAt && e.refreshFailedAt >= since))
  const names = new Set(touched.map((e) => e.login.toLowerCase()))
  const entries = [...touched, ...(remote?.entries || []).filter((e) => !names.has(e.login.toLowerCase()))].sort((a, b) => b.score - a.score)
  const updatedAt = [local?.updatedAt, remote?.updatedAt].filter(Boolean).sort().pop() || null
  return { entries, updatedAt }
}

/** Oldest certificates first, only those older than `days`, skipping accounts whose last refresh failed recently. */
export function pickStale(index, { days = 6, batch = 25, now = Date.now(), retryDays = 30 } = {}) {
  const ago = (d) => now - d * 864e5
  return (index?.entries || [])
    .filter((e) => Date.parse(e.issuedAt) < ago(days))
    .filter((e) => !e.refreshFailedAt || Date.parse(e.refreshFailedAt) < ago(retryDays))
    .sort((a, b) => Date.parse(a.issuedAt) - Date.parse(b.issuedAt))
    .slice(0, batch)
    .map((e) => e.login)
}
