// Notes that refreshing a login failed, so the daily run does not retry it for 30 days.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
const login = (process.argv[2] || '').toLowerCase()
if (!existsSync('data/index.json') || !login) process.exit(0)
const index = JSON.parse(readFileSync('data/index.json', 'utf8'))
for (const e of index.entries) if (e.login.toLowerCase() === login) e.refreshFailedAt = new Date().toISOString()
writeFileSync('data/index.json', JSON.stringify(index, null, 1) + '\n')
