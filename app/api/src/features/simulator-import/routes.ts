import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import type { RouteDependencies } from '../../dependencies.js'
import { ApiError } from '../../errors.js'
import { projectResponseInclude, toProjectResponse } from '../projects/response.js'
import type { SimulatorIntegration } from './service.js'

const ImportSchema = z.object({
  sourceProjectId: z.string().min(1),
  hiringManagerUserIds: z.array(z.string().min(1)).min(1),
  assignedHumanResourceUserIds: z.array(z.string().min(1)).min(1),
}).strict()

export function registerSimulatorImportRoutes(app: FastifyInstance, { prisma, authService }: RouteDependencies, integration?: SimulatorIntegration) {
  app.get('/integrations/rsc-simulator', async (request) => {
    await authService.requireAppRole(request, ['admin', 'human_resource'])
    return { enabled: Boolean(integration) }
  })
  app.get('/integrations/rsc-simulator/project', async (request) => {
    await authService.requireAppRole(request, ['admin', 'human_resource'])
    if (!integration) throw new ApiError(503, 'Simulator integration is not configured')
    const { sourceProjectId } = z.object({ sourceProjectId: z.string().min(1) }).strict().parse(request.query)
    const snapshot = await integration.readSource(sourceProjectId)
    if (snapshot.project.id !== sourceProjectId) throw new ApiError(502, 'Simulator returned a different project')
    return { project: snapshot.project, candidateCount: snapshot.candidates.length,
      shortlistedCount: snapshot.candidates.filter((person) => person.stage === 'shortlisted').length }
  })
  app.get('/integrations/rsc-simulator/projects', async (request) => {
    await authService.requireAppRole(request, ['admin', 'human_resource'])
    if (!integration) throw new ApiError(503, 'Simulator integration is not configured')
    return integration.listSourceProjects()
  })
  app.post('/integrations/rsc-simulator/import', async (request, reply) => {
    const session = await authService.requireAppRole(request, ['admin', 'human_resource'])
    if (!integration) throw new ApiError(503, 'Simulator integration is not configured')
    const id = await integration.importProject(session.userId, ImportSchema.parse(request.body))
    const project = await prisma.project.findUniqueOrThrow({ where: { id }, include: projectResponseInclude })
    return reply.status(201).send(toProjectResponse(project))
  })
  app.post('/projects/:projectId/simulator-sync', async (request) => {
    await authService.requireAppRole(request, ['admin', 'human_resource'])
    if (!integration) throw new ApiError(503, 'Simulator integration is not configured')
    const { projectId } = request.params as { projectId: string }
    return integration.syncProject(projectId)
  })
}
