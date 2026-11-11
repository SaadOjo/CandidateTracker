import { Prisma } from '@prisma/client'

export const rejectionFollowUpResponseInclude = Prisma.validator<Prisma.RejectionFollowUpInclude>()({
  application: {
    include: {
      candidate: true,
    },
  },
  project: {
    select: {
      id: true,
      name: true,
      status: true,
    },
  },
  contactAttempts: {
    orderBy: { attemptedAt: 'desc' },
  },
})

type RejectionFollowUpWithResponse = Prisma.RejectionFollowUpGetPayload<{ include: typeof rejectionFollowUpResponseInclude }>

export function toRejectionFollowUpResponse(followUp: RejectionFollowUpWithResponse) {
  return {
    id: followUp.id,
    candidateApplicationId: followUp.candidateApplicationId,
    projectId: followUp.projectId,
    status: followUp.status,
    reason: followUp.reason,
    eligibleAt: followUp.eligibleAt,
    handledAt: followUp.handledAt,
    attemptCount: followUp.contactAttempts.length,
    lastAttemptAt: followUp.contactAttempts[0]?.attemptedAt ?? null,
    candidate: {
      id: followUp.application.id,
      candidateId: followUp.application.candidateId,
      name: followUp.application.candidate.fullName,
      stage: followUp.application.stage,
      status: followUp.application.status,
      email: followUp.application.candidate.email,
      phone: followUp.application.candidate.phone,
    },
    project: followUp.project,
  }
}
