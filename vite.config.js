import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// While developing before a repository exists, serve ./data so the pages have something to read.
function serveData() {
  const types = { '.json': 'application/json', '.svg': 'image/svg+xml' }
  return {
    name: 'serve-data',
    configureServer(server) {
      server.middlewares.use('/data', (req, res, next) => {
        const file = normalize(join(process.cwd(), 'data', decodeURIComponent(req.url.split('?')[0])))
        if (!file.startsWith(join(process.cwd(), 'data')) || !existsSync(file) || !statSync(file).isFile()) return next()
        res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream')
        createReadStream(file).pipe(res)
      })
    },
  }
}

export default defineConfig({
  // Relative assets work under https://user.github.io/repo/ with no extra setting.
  base: './',
  plugins: [react(), tailwindcss(), serveData()],
})
