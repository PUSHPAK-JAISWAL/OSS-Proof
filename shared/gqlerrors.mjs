/**
 * Turns a GraphQL response body into data. GitHub answers with BOTH data and errors when part of a query is not
 * allowed (an organization that blocks long-lived tokens, SAML single sign-on, a removed repository). The allowed
 * part is still good, so it is kept and the errors are attached as __errors. Rate limits and total failures throw.
 */
export function gqlData(body) {
  const errors = body.errors || []
  if (errors.some((e) => e.type === 'RATE_LIMITED')) {
    const err = new Error("GitHub's rate limit is used up. Try again in a few minutes.")
    err.rateLimited = true
    throw err
  }
  if (errors.length && !body.data) throw new Error(errors[0].message || 'GitHub could not read that profile.')
  if (errors.length) Object.defineProperty(body.data, '__errors', { value: errors, enumerable: false })
  return body.data
}

/** Organization names mentioned in "The 'Org' organization forbids access ..." style messages. */
export function restrictedOrgsFrom(errors = []) {
  const names = new Set()
  for (const e of errors) {
    const m = String(e.message || '').match(/The '([^']+)' organization/i)
    if (m) names.add(m[1])
  }
  return [...names]
}
