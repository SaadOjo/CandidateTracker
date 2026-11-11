import { createSimulator, SimulatorError } from './simulator.mjs'
import { demoProjects } from './fixtures.mjs'

// Public protocol fixtures, not credentials or access protection.
const token = 'rsc-local-test-token'
const secret = 'rsc-local-test-secret'
const json = (value, status = 200, headers = {}) => Response.json(value, { status, headers })

export async function readJson(request) {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    throw new SimulatorError(415, 'Use application/json')
  }
  const reader = request.body?.getReader()
  if (!reader) throw new SimulatorError(400, 'Invalid JSON')
  const chunks = []
  let size = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > 16_384) {
      await reader.cancel()
      throw new SimulatorError(413, 'Request body is too large')
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  try { return JSON.parse(new TextDecoder().decode(bytes)) }
  catch { throw new SimulatorError(400, 'Invalid JSON') }
}

export async function handleApi(request, storage, clock = Date.now) {
  try {
    const url = new URL(request.url)
    const method = request.method
    const path = url.pathname
    const open = (id) => {
      if (!id) throw new SimulatorError(400, 'projectId is required')
      return createSimulator({ token, secret, projectId: id, clock,
        savedState: storage.readProject(id), exportStore: storage.exportsFor(id) })
    }
    const selected = () => open(url.searchParams.get('projectId'))
    const exportSource = (id) => {
      const source = id && storage.sourceProject(id)
      if (!source) throw new SimulatorError(404, 'Unknown export request')
      return open(source)
    }
    const persist = (simulator) => storage.saveProject(simulator.snapshot().project.id, simulator.serialize())

    if (method === 'GET' && path === '/simulator/projects') {
      return json({ projects: demoProjects.map(({ project }) => {
        const snapshot = open(project.id).snapshot()
        return { ...project, candidateCount: snapshot.candidates.length, exportedAt: snapshot.projectExport.exportedAt }
      }) })
    }
    if (method === 'GET' && path === '/simulator/state') return json(selected().snapshot())
    if (method === 'GET' && path === '/simulator/project-export') {
      return json(selected().retrieveProject(request.headers.get('authorization')))
    }
    if (method === 'POST' && path === '/simulator/project-export') {
      const simulator = selected()
      const status = simulator.publishProject()
      persist(simulator)
      return json(status)
    }
    if (method === 'GET' && path === '/simulator/project-download') {
      const snapshot = selected().retrieveProject(`Bearer ${token}`)
      return json(snapshot, 200, { 'Content-Disposition': `attachment; filename="${snapshot.project.id}.json"` })
    }
    if (method === 'PATCH' && path.startsWith('/simulator/candidates/')) {
      const input = await readJson(request)
      if (!input || Array.isArray(input) || Object.keys(input).length !== 1 || typeof input.stage !== 'string') {
        throw new SimulatorError(400, 'Expected a stage')
      }
      // Load only after awaiting input so concurrent requests cannot overwrite newer state.
      const simulator = selected()
      const result = simulator.moveCandidate(path.slice('/simulator/candidates/'.length), input.stage)
      persist(simulator)
      return json(result)
    }
    if (method === 'POST' && path === '/simulator/exports') {
      const input = await readJson(request)
      return json(selected().prepareExport(input), 201)
    }
    if (method === 'GET' && path.startsWith('/simulator/exports/')) {
      const id = path.slice('/simulator/exports/'.length)
      const entry = exportSource(id).inspectExport(id)
      const type = url.searchParams.get('download')
      if (type === null) return json(entry)
      if (!['notification', 'response', 'request', 'headers'].includes(type)) throw new SimulatorError(400, 'Unknown payload type')
      return new Response(type === 'notification' ? entry.notificationBody : JSON.stringify(type === 'headers' ? entry.notificationHeaders : entry[type], null, 2), {
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="rsc-${type}-${id}.json"` },
      })
    }
    if (method === 'GET' && path === '/rest/exportedCandidates') {
      if (request.headers.get('authorization') !== `Bearer ${token}`) throw new SimulatorError(401, 'Invalid simulator bearer token')
      if (url.searchParams.get('q') !== 'request' || !url.searchParams.get('requestId')) {
        throw new SimulatorError(400, 'q=request and requestId are required')
      }
      return json(exportSource(url.searchParams.get('requestId')).retrieveExport({
        authorization: request.headers.get('authorization'), version: request.headers.get('linkedin-version'),
        query: url.searchParams.get('q'), requestId: url.searchParams.get('requestId'),
      }))
    }
    throw new SimulatorError(404, 'Route not found')
  } catch (error) {
    if (!(error instanceof SimulatorError)) console.error('Simulator request failed', error)
    return json({ error: error instanceof SimulatorError ? error.message : 'Simulator error' }, error instanceof SimulatorError ? error.status : 500)
  }
}
