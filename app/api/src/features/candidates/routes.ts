import type { FastifyInstance } from 'fastify'
import type { RouteDependencies } from '../../dependencies.js'
import { Prisma } from '@prisma/client'
import { CandidateTransitionSchema, ListCandidatesQuerySchema, UpsertCandidateNoteSchema } from '../../domain.js'
import { candidateResponseInclude, toCandidateResponse } from './response.js'
import { applyCandidateTransition } from './workflow.js'

export function registerCandidateRoutes(app: FastifyInstance, { prisma, authService }: RouteDependencies) {
  app.get('/candidates', async (request) => {
    const session = await authService.getSession(request)
    const query = ListCandidatesQuerySchema.parse(request.query)

    const applications = await prisma.candidateApplication.findMany({
      where: {
        projectId: query.projectId,
        stage: query.stage,
        status: query.status,
        candidate: query.query?.trim()
          ? { fullName: { contains: query.query.trim(), mode: 'insensitive' } }
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
      include: candidateResponseInclude,
    })

    return applications.map((application) => toCandidateResponse(application, session.role))
  })

  app.get('/candidates/:candidateId', async (request, reply) => {
    const session = await authService.getSession(request)
    const { candidateId } = request.params as { candidateId: string }
    const application = await prisma.candidateApplication.findUnique({
      where: { id: candidateId },
      include: candidateResponseInclude,
    })

    if (!application) return reply.status(404).send({ error: 'Candidate not found' })
    return toCandidateResponse(application, session.role)
  })

  app.post('/candidates/:candidateId/transition', async (request, reply) => {
    const session = await authService.requireAppRole(request, ['admin', 'human_resource', 'hiring_manager'])
    const { candidateId } = request.params as { candidateId: string }
    const input = CandidateTransitionSchema.parse(request.body)
    const application = await prisma.candidateApplication.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        projectId: true,
        stage: true,
        status: true,
      },
    })

    if (!application) return reply.status(404).send({ error: 'Candidate not found' })

    await applyCandidateTransition(prisma, application, input, session.userId, session.role)

    const updated = await prisma.candidateApplication.findUnique({
      where: { id: application.id },
      include: candidateResponseInclude,
    })

    if (!updated) return reply.status(404).send({ error: 'Candidate not found' })
    return toCandidateResponse(updated, session.role)
  })

  app.put('/candidates/:candidateId/note', async (request, reply) => {
    const session = await authService.requireAppRole(request, ['admin', 'human_resource', 'hiring_manager'])
    const { candidateId } = request.params as { candidateId: string }
    const input = UpsertCandidateNoteSchema.parse(request.body)
    const application = await prisma.candidateApplication.findUnique({
      where: { id: candidateId },
      select: { id: true },
    })

    if (!application) return reply.status(404).send({ error: 'Candidate not found' })

    const authorRole = session.appRole === 'hiring_manager' ? 'hiring_manager' : 'human_resource'

    await prisma.candidateNote.upsert({
      where: {
        candidateApplicationId_authorUserId: {
          candidateApplicationId: application.id,
          authorUserId: session.userId,
        },
      },
      create: {
        candidateApplicationId: application.id,
        authorUserId: session.userId,
        authorRole,
        visibility: input.visibility,
        body: input.body ?? null,
        fields: input.fields ?? Prisma.JsonNull,
      },
      update: {
        authorRole,
        visibility: input.visibility,
        body: input.body ?? null,
        fields: input.fields ?? Prisma.JsonNull,
      },
    })

    const updated = await prisma.candidateApplication.findUnique({
      where: { id: application.id },
      include: candidateResponseInclude,
    })

    if (!updated) return reply.status(404).send({ error: 'Candidate not found' })
    return toCandidateResponse(updated, session.role)
  })
}
