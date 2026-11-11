import type { FastifyInstance } from 'fastify'
import type { RouteDependencies } from '../../dependencies.js'
import { ListRejectionFollowUpsQuerySchema, LogRejectionContactAttemptSchema } from '../../domain.js'
import { rejectionFollowUpResponseInclude, toRejectionFollowUpResponse } from './response.js'
import { ApiError } from '../../errors.js'

export function registerRejectionFollowUpRoutes(app: FastifyInstance, { prisma, authService }: RouteDependencies) {
  app.get('/rejection-follow-ups', async (request) => {
    await authService.requireAppRole(request, ['admin', 'human_resource'])
    const query = ListRejectionFollowUpsQuerySchema.parse(request.query)
    const search = query.query?.trim()

    const followUps = await prisma.rejectionFollowUp.findMany({
      where: {
        projectId: query.projectId,
        status: query.status,
        eligibleAt: { lte: new Date() },
        application: search
          ? { candidate: { fullName: { contains: search, mode: 'insensitive' } } }
          : undefined,
      },
      orderBy: [
        { status: 'asc' },
        { eligibleAt: 'asc' },
      ],
      include: rejectionFollowUpResponseInclude,
    })

    return followUps.map(toRejectionFollowUpResponse)
  })

  app.post('/rejection-follow-ups/:followUpId/contact-attempts', async (request, reply) => {
    const session = await authService.requireAppRole(request, ['admin', 'human_resource'])
    const { followUpId } = request.params as { followUpId: string }
    const input = LogRejectionContactAttemptSchema.parse(request.body)
    const existing = await prisma.rejectionFollowUp.findUnique({
      where: { id: followUpId },
      select: {
        id: true,
        candidateApplicationId: true,
        projectId: true,
        status: true,
      },
    })

    if (!existing) return reply.status(404).send({ error: 'Rejection follow-up not found' })
    if (existing.status === 'handled') return reply.status(409).send({ error: 'Rejection follow-up has already been handled' })

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM rejection_follow_ups WHERE id = ${existing.id} FOR UPDATE`
      const current = await tx.rejectionFollowUp.findUnique({ where: { id: existing.id } })
      if (!current) throw new ApiError(404, 'Rejection follow-up not found')
      if (current.status === 'handled') throw new ApiError(409, 'Rejection follow-up has already been handled')
      if (current.eligibleAt.getTime() > Date.now()) throw new ApiError(409, 'Rejection follow-up is not eligible yet')
      const handled = input.result === 'rejection_handled'

      await tx.contactAttempt.create({
        data: {
          candidateApplicationId: existing.candidateApplicationId,
          rejectionFollowUpId: existing.id,
          context: 'rejection_follow_up',
          result: input.result,
          attemptedAt: input.attemptedAt,
          notes: input.notes,
          createdByUserId: session.userId,
        },
      })

      await tx.rejectionFollowUp.update({
        where: { id: existing.id },
        data: {
          status: handled ? 'handled' : 'not_reached',
          handledAt: handled ? input.attemptedAt : null,
        },
      })

      await tx.activityEvent.create({
        data: {
          candidateApplicationId: existing.candidateApplicationId,
          projectId: existing.projectId,
          eventType: handled ? 'rejection_handled' : 'rejection_contact_attempted',
          title: handled ? 'Rejection Follow-Up Handled' : 'Rejection Contact Attempt Logged',
          subtitle: input.notes ?? (handled ? 'Candidate was informed of the rejection.' : 'Candidate was not reached.'),
          actorUserId: session.userId,
          actorRole: session.role,
          occurredAt: input.attemptedAt,
        },
      })
    })

    const updated = await prisma.rejectionFollowUp.findUnique({
      where: { id: existing.id },
      include: rejectionFollowUpResponseInclude,
    })

    if (!updated) return reply.status(404).send({ error: 'Rejection follow-up not found' })
    return toRejectionFollowUpResponse(updated)
  })
}
