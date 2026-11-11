import { createHmac, randomUUID } from 'node:crypto'
import { apiVersion, demoProjects, integrationContext, pipelineStages, requester } from './fixtures.mjs'

export class SimulatorError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function createSimulator({ token, secret, projectId, clock = Date.now }) {
  if (!token || !secret) throw new Error('Simulator token and signing secret are required')
  const fixture = demoProjects.find((entry) => entry.project.id === projectId)
  if (!fixture) throw new SimulatorError(404, 'Unknown simulator project')
  const { project, candidates } = fixture
  const exports = new Map()
  const stages = new Map(candidates.map((candidate) => [candidate.id, 'uncontacted']))
  let publishedProject = null
  let exportedAt = null
  const lifetime = 24 * 60 * 60 * 1000

  function projectExportStatus() {
    return {
      exportedAt,
      hasUnexportedChanges: !publishedProject || publishedProject.candidates.some((person) => person.stage !== stages.get(person.id)),
    }
  }

  function findExport(id) {
    const entry = exports.get(id)
    if (!entry) throw new SimulatorError(404, 'Unknown export request')
    return entry
  }

  return {
    snapshot() {
      return {
        mode: 'local-simulator', apiVersion, integrationContext, project, pipelineStages,
        candidates: candidates.map((candidate) => ({ ...candidate, stage: stages.get(candidate.id) })),
        projectExport: projectExportStatus(),
        exports: [...exports.values()].reverse().map(({ notification, response }) => ({
          id: notification.id, requestedAt: response.elements[0].requestedAt,
          expiresAt: notification.expiresAt, count: response.elements.length,
          candidateIds: response.elements.map((element) => element.candidate.member),
        })),
      }
    },
    moveCandidate(id, stage) {
      if (!stages.has(id)) throw new SimulatorError(404, 'Unknown candidate')
      if (!pipelineStages.includes(stage)) throw new SimulatorError(400, 'Unknown pipeline stage')
      stages.set(id, stage)
      return { id, stage }
    },
    publishProject() {
      publishedProject = structuredClone({
        contract: 'candidate-tracker-simulator-project-v1',
        integrationContext,
        project,
        pipelineStages,
        candidates: candidates.map((candidate) => ({ ...candidate, stage: stages.get(candidate.id) })),
      })
      exportedAt = clock()
      return projectExportStatus()
    },
    retrieveProject(authorization) {
      if (authorization !== `Bearer ${token}`) throw new SimulatorError(401, 'Invalid simulator bearer token')
      if (!publishedProject) throw new SimulatorError(409, 'No project export yet. Press Export Project first.')
      return structuredClone(publishedProject)
    },
    prepareExport(input) {
      if (!input || typeof input !== 'object' || Array.isArray(input)
        || Object.keys(input).some((key) => !['candidateIds', 'notes'].includes(key))) {
        throw new SimulatorError(400, 'Expected candidateIds and optional notes')
      }
      const { candidateIds, notes = '' } = input
      if (!Array.isArray(candidateIds) || candidateIds.length < 1 || candidateIds.length > candidates.length
        || candidateIds.some((id) => typeof id !== 'string') || new Set(candidateIds).size !== candidateIds.length) {
        throw new SimulatorError(400, 'Select between 1 and 10 distinct candidates')
      }
      if (typeof notes !== 'string' || notes.length > 2000) throw new SimulatorError(400, 'Notes must be at most 2000 characters')
      const selected = candidateIds.map((id) => {
        const candidate = candidates.find((person) => person.id === id)
        if (!candidate) throw new SimulatorError(400, `Unknown candidate: ${id}`)
        return candidate
      })
      if (exports.size >= 500) throw new SimulatorError(409, 'Session export limit reached. Restart the simulator to clear exports.')
      const requestedAt = clock()
      const id = randomUUID()
      const notification = { id, type: 'EXPORT_CANDIDATE_PROFILE', expiresAt: requestedAt + lifetime }
      const notificationBody = JSON.stringify(notification)
      const entry = {
        notification,
        notificationBody,
        notificationHeaders: {
          'Content-Type': 'application/json',
          // LinkedIn documents signing the prefix plus the exact UTF-8 request body.
          'X-LI-Signature': createHmac('sha256', secret).update(`hmacsha256=${notificationBody}`, 'utf8').digest('hex'),
        },
        request: {
          method: 'GET',
          path: `/rest/exportedCandidates?q=request&requestId=${id}`,
          headers: { Authorization: `Bearer ${token}`, 'LinkedIn-Version': apiVersion },
        },
        response: {
          paging: { start: 0, count: selected.length, links: [], total: selected.length },
          elements: selected.map(({ id: localId, ...candidate }) => {
            void localId
            return {
              requester, candidate, ...(notes.trim() ? { notes: notes.trim() } : {}), requestedAt,
              integrationContext, source: 'LINKEDIN',
              referenceEntityType: project.referenceEntityType, referenceEntityId: project.referenceEntityId,
            }
          }),
        },
      }
      exports.set(id, entry)
      return entry
    },
    inspectExport: findExport,
    retrieveExport({ authorization, version, query, requestId }) {
      if (authorization !== `Bearer ${token}`) throw new SimulatorError(401, 'Invalid simulator bearer token')
      if (version !== apiVersion) throw new SimulatorError(400, `Simulator supports LinkedIn-Version ${apiVersion} only`)
      if (query !== 'request' || !requestId) throw new SimulatorError(400, 'q=request and requestId are required')
      const entry = findExport(requestId)
      if (clock() >= entry.notification.expiresAt) throw new SimulatorError(410, 'Export request expired')
      return entry.response
    },
  }
}
