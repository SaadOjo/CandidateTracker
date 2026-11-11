import type { FastifyInstance } from 'fastify'
import type { RouteDependencies } from '../../dependencies.js'
import { Prisma } from '@prisma/client'
import { CandidateStageSchema, CreateProjectSchema, ListProjectsQuerySchema, UpdateProjectStageCommentSchema, UpdateProjectSchema } from '../../domain.js'
import { projectResponseInclude, toProjectResponse } from './response.js'
import { createProjectService } from './service.js'

export function registerProjectRoutes(app: FastifyInstance, { prisma, authService }: RouteDependencies) {
  const { requireProject, validateProjectAssignment, saveStageComment } = createProjectService(prisma)

  app.get('/projects', async (request) => {
    const query = ListProjectsQuerySchema.parse(request.query)
    const search = query.query?.trim()
    const where: Prisma.ProjectWhereInput = {
      status: query.status,
      OR: search
        ? [
            { name: { contains: search, mode: 'insensitive' } },
            { position: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: projectResponseInclude,
    })

    return projects.map(toProjectResponse)
  })

  app.get('/projects/:projectId', async (request, reply) => {
    const { projectId } = request.params as { projectId: string }
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: projectResponseInclude,
    })

    if (!project) return reply.status(404).send({ error: 'Project not found' })
    return toProjectResponse(project)
  })

  app.patch('/projects/:projectId/stage-comments/:stage', async (request, reply) => {
    const { projectId, stage } = request.params as { projectId: string; stage: string }
    const parsedStage = CandidateStageSchema.parse(stage)
    const session = await authService.requireAppRole(request, parsedStage === 'pre_interview' ? ['hiring_manager'] : ['admin', 'human_resource', 'hiring_manager'])
    const input = UpdateProjectStageCommentSchema.parse(request.body)
    const authorRole = session.appRole === 'hiring_manager' ? 'hiring_manager' : 'human_resource'

    await saveStageComment(projectId, parsedStage, session.userId, authorRole, input.body)

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: projectResponseInclude,
    })

    if (!project) return reply.status(404).send({ error: 'Project not found' })
    return toProjectResponse(project)
  })

  app.post('/projects', async (request, reply) => {
    const session = await authService.requireAppRole(request, ['admin', 'human_resource'])
    const input = CreateProjectSchema.parse(request.body)
    const assignment = await validateProjectAssignment(input.hiringManagerUserIds, input.assignedHumanResourceUserIds)

    const project = await prisma.project.create({
      data: {
        createdByUserId: session.userId,
        name: input.name,
        position: input.position,
        notes: input.notes,
        members: {
          create: [
            ...assignment.hiringManagerUserIds.map((userId) => ({ userId, projectRole: 'hiring_manager' as const })),
            ...assignment.assignedHumanResourceUserIds.map((userId) => ({ userId, projectRole: 'human_resource' as const })),
          ],
        },
        externalReferences: input.linkedinProjectId
          ? {
              create: {
                resourceType: 'project',
                provider: 'linkedin',
                externalId: input.linkedinProjectId,
                metadata: { importMode: input.importMode },
              },
            }
          : undefined,
      },
      include: projectResponseInclude,
    })

    return reply.status(201).send(toProjectResponse(project))
  })

  app.put('/projects/:projectId', async (request) => {
    await authService.requireAppRole(request, ['admin', 'human_resource'])
    const { projectId } = request.params as { projectId: string }
    const input = UpdateProjectSchema.parse(request.body)
    const assignment = await validateProjectAssignment(input.hiringManagerUserIds, input.assignedHumanResourceUserIds)

    await requireProject(projectId)

    const project = await prisma.$transaction(async (tx) => {
      await tx.projectMember.deleteMany({ where: { projectId } })
      await tx.externalReference.deleteMany({
        where: {
          projectId,
          provider: 'linkedin',
          resourceType: 'project',
        },
      })

      return tx.project.update({
        where: { id: projectId },
        data: {
          name: input.name,
          position: input.position,
          notes: input.notes ?? null,
          members: {
            create: [
              ...assignment.hiringManagerUserIds.map((userId) => ({ userId, projectRole: 'hiring_manager' as const })),
              ...assignment.assignedHumanResourceUserIds.map((userId) => ({ userId, projectRole: 'human_resource' as const })),
            ],
          },
          externalReferences: input.linkedinProjectId
            ? {
                create: {
                  resourceType: 'project',
                  provider: 'linkedin',
                  externalId: input.linkedinProjectId,
                  metadata: { importMode: input.importMode },
                },
              }
            : undefined,
        },
        include: projectResponseInclude,
      })
    })

    return toProjectResponse(project)
  })

  app.patch('/projects/:projectId/archive', async (request) => {
    await authService.requireAppRole(request, ['admin', 'human_resource'])
    const { projectId } = request.params as { projectId: string }
    await requireProject(projectId)

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        status: 'archived',
        archivedAt: new Date(),
      },
      include: projectResponseInclude,
    })

    return toProjectResponse(project)
  })
}
