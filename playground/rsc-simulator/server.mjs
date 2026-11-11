import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { createSimulator, SimulatorError } from './simulator.mjs'
import { demoProjects } from './fixtures.mjs'

const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/mark.svg', ['mark.svg', 'image/svg+xml']],
])

async function readJson(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 16_384) throw new SimulatorError(413, 'Request body is too large')
    chunks.push(chunk)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { throw new SimulatorError(400, 'Invalid JSON') }
}

export function buildServer(options = {}) {
  const simulators = new Map(demoProjects.map(({ project }) => [project.id, createSimulator({
    projectId: project.id,
    token: options.token ?? 'rsc-local-test-token',
    secret: options.secret ?? 'rsc-local-test-secret',
    clock: options.clock,
  })]))
  const exportSources = new Map()
  function selectedSimulator(url) {
    const id = url.searchParams.get('projectId')
    if (!id) throw new SimulatorError(400, 'projectId is required')
    const simulator = simulators.get(id)
    if (!simulator) throw new SimulatorError(404, 'Unknown simulator project')
    return simulator
  }
  function exportSource(id) {
    const simulator = exportSources.get(id)
    if (!simulator) throw new SimulatorError(404, 'Unknown export request')
    return simulator
  }
  return createServer(async (request, response) => {
    const json = (status, value) => {
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
      response.end(JSON.stringify(value))
    }
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
    try {
      const expectedHost = `127.0.0.1:${response.socket.localPort}`
      if (request.headers.host !== expectedHost) throw new SimulatorError(403, 'Use the simulator loopback URL')
      const origin = request.headers.origin
      if ((origin && origin !== `http://${expectedHost}`) || request.headers['sec-fetch-site'] === 'cross-site') {
        throw new SimulatorError(403, 'Cross-origin requests are not allowed')
      }
      const url = new URL(request.url, `http://${expectedHost}`)
      if (request.method === 'GET' && assets.has(url.pathname)) {
        const [file, contentType] = assets.get(url.pathname)
        const body = await readFile(new URL(`./public/${file}`, import.meta.url))
        response.writeHead(200, { 'Content-Type': contentType })
        return response.end(body)
      }
      if (request.method === 'GET' && url.pathname === '/simulator/projects') {
        return json(200, { projects: [...simulators.values()].map((simulator) => {
          const snapshot = simulator.snapshot()
          return { ...snapshot.project, candidateCount: snapshot.candidates.length, exportedAt: snapshot.projectExport.exportedAt }
        }) })
      }
      if (request.method === 'GET' && url.pathname === '/simulator/state') return json(200, selectedSimulator(url).snapshot())
      if (request.method === 'GET' && url.pathname === '/simulator/project-export') {
        return json(200, selectedSimulator(url).retrieveProject(request.headers.authorization))
      }
      if (request.method === 'POST' && url.pathname === '/simulator/project-export') {
        return json(200, selectedSimulator(url).publishProject())
      }
      if (request.method === 'GET' && url.pathname === '/simulator/project-download') {
        const snapshot = selectedSimulator(url).retrieveProject(`Bearer ${options.token ?? 'rsc-local-test-token'}`)
        response.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${snapshot.project.id}.json"`,
        })
        return response.end(JSON.stringify(snapshot, null, 2))
      }
      if (request.method === 'PATCH' && url.pathname.startsWith('/simulator/candidates/')) {
        if (!request.headers['content-type']?.startsWith('application/json')) throw new SimulatorError(415, 'Use application/json')
        const input = await readJson(request)
        if (!input || Object.keys(input).length !== 1 || typeof input.stage !== 'string') throw new SimulatorError(400, 'Expected a stage')
        return json(200, selectedSimulator(url).moveCandidate(url.pathname.slice('/simulator/candidates/'.length), input.stage))
      }
      if (request.method === 'POST' && url.pathname === '/simulator/exports') {
        if (!request.headers['content-type']?.startsWith('application/json')) throw new SimulatorError(415, 'Use application/json')
        const simulator = selectedSimulator(url)
        const entry = simulator.prepareExport(await readJson(request))
        exportSources.set(entry.notification.id, simulator)
        return json(201, entry)
      }
      if (request.method === 'GET' && url.pathname.startsWith('/simulator/exports/')) {
        const id = url.pathname.slice('/simulator/exports/'.length)
        const entry = exportSource(id).inspectExport(id)
        const download = url.searchParams.get('download')
        if (download !== null) {
          if (!['notification', 'response', 'request', 'headers'].includes(download)) {
            throw new SimulatorError(400, 'Unknown payload type')
          }
          const body = download === 'notification' ? entry.notificationBody
            : JSON.stringify(download === 'headers' ? entry.notificationHeaders : entry[download], null, 2)
          response.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="rsc-${download}-${entry.notification.id}.json"`,
          })
          return response.end(body)
        }
        return json(200, entry)
      }
      if (request.method === 'GET' && url.pathname === '/rest/exportedCandidates') {
        return json(200, exportSource(url.searchParams.get('requestId')).retrieveExport({
          authorization: request.headers.authorization, version: request.headers['linkedin-version'],
          query: url.searchParams.get('q'), requestId: url.searchParams.get('requestId'),
        }))
      }
      throw new SimulatorError(404, 'Route not found')
    } catch (error) {
      if (!(error instanceof SimulatorError)) console.error(error)
      json(error instanceof SimulatorError ? error.status : 500, {
        error: error instanceof SimulatorError ? error.message : 'Simulator error',
      })
    }
  })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.env.NODE_ENV === 'production') throw new Error('The RSC simulator must not run in production')
  const port = Number(process.env.PORT ?? 5180)
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT must be between 1024 and 65535')
  const server = buildServer({ token: process.env.RSC_SIMULATOR_TOKEN, secret: process.env.RSC_SIMULATOR_SECRET })
  server.listen(port, '127.0.0.1', () => console.log(`RSC local simulator: http://127.0.0.1:${port}`))
  server.on('error', (error) => { console.error(error.message); process.exitCode = 1 })
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close())
}
