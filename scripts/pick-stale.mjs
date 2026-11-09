// Prints the logins that need a fresh certificate, one per line, oldest first.
import { existsSync, readFileSync } from 'node:fs'
import { isValidLogin } from '../shared/analyze.mjs'
import { pickStale } from '../shared/mergeindex.mjs'

const index = existsSync('data/index.json') ? JSON.parse(readFileSync('data/index.json', 'utf8')) : { entries: [] }
const batch = Math.max(1, Math.min(60, Number(process.env.BATCH) || 25))
for (const login of pickStale(index, { batch, days: Number(process.env.DAYS) || 6 })) if (isValidLogin(login)) console.log(login)
