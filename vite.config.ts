import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(rootDir, 'data')

const CONTENT_TYPES: Record<string, string> = {
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

/**
 * `data/lessons.json` is written by a separate process and must stay editable
 * without rebuilding, so it is never imported into the bundle. This plugin
 * serves the repo's `data/` directory at `/data/*` during `vite dev`, and
 * copies it into the build output so the same URL keeps working after
 * `vite build`.
 */
function serveDataDirectory(): Plugin {
  let outDir = path.join(rootDir, 'dist')
  let command = 'serve'

  const resolveRequestedFile = (requestUrl: string | undefined): string | null => {
    let pathname: string
    try {
      pathname = decodeURIComponent((requestUrl ?? '/').split('?')[0]!.split('#')[0]!)
    } catch {
      return null
    }
    // Collapse any `..` segments against the root before joining, so a request
    // can never escape `data/`.
    const safeSuffix = path.posix.resolve('/', pathname).slice(1)
    if (!safeSuffix) return null
    const resolved = path.resolve(dataDir, safeSuffix)
    if (resolved !== dataDir && !resolved.startsWith(dataDir + path.sep)) return null
    return resolved
  }

  return {
    name: 'attariqa:serve-data-directory',
    configResolved(config) {
      command = config.command
      outDir = path.resolve(config.root, config.build.outDir)
    },
    configureServer(server) {
      server.middlewares.use('/data', (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          next()
          return
        }

        const sendJson = (status: number, body: unknown) => {
          res.statusCode = status
          res.setHeader('Content-Type', CONTENT_TYPES['.json']!)
          res.setHeader('Cache-Control', 'no-store')
          res.end(JSON.stringify(body))
        }

        const filePath = resolveRequestedFile(req.url)
        if (!filePath) {
          sendJson(400, { error: 'Bad data request' })
          return
        }

        let stat: fs.Stats
        try {
          stat = fs.statSync(filePath)
        } catch {
          sendJson(404, { error: `No such data file: ${req.url}` })
          return
        }
        if (!stat.isFile()) {
          sendJson(404, { error: `Not a file: ${req.url}` })
          return
        }

        res.statusCode = 200
        res.setHeader('Content-Type', CONTENT_TYPES[path.extname(filePath)] ?? 'application/octet-stream')
        // Always re-read from disk: the lesson data changes underneath us.
        res.setHeader('Cache-Control', 'no-store')
        res.setHeader('Content-Length', String(stat.size))
        if (req.method === 'HEAD') {
          res.end()
          return
        }
        fs.createReadStream(filePath).pipe(res)
      })
    },
    // No `configurePreviewServer` hook on purpose: `vite preview` should serve
    // the real `dist/data` output, so a broken copy step cannot hide behind the
    // dev middleware.
    closeBundle() {
      if (command !== 'build') return
      if (!fs.existsSync(dataDir)) return
      fs.cpSync(dataDir, path.join(outDir, 'data'), { recursive: true })
    },
  }
}

export default defineConfig({
  plugins: [react(), serveDataDirectory()],
  server: { port: 5173 },
  preview: { port: 4173 },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
