import { Prisma, type PrismaClient, type Role } from '@prisma/client'
import { CandidateTransitionSchema } from '../../domain.js'
import { ApiError } from '../../errors.js'
import type { CandidateApplicationWithResponse } from './response.js'
import { assertTransitionAllowed } from './transition-policy.js'

export async function applyCandidateTransition(
  prisma: PrismaClient,
  application: Pick<CandidateApplicationWithResponse, 'id' | 'projectId' | 'stage' | 'status'>,
  input: ReturnType<typeof CandidateTransitionSchema.parse>,
  actorUserId: string,
  actorRole: Role,
) {
  const now = input.occurredAt ?? new Date()
  const action = input.action

  await prisma.$transaction(async (tx) => {
    // Serialize workflow changes within a project, including offer queue updates.
    await tx.$queryRaw`SELECT id FROM projects WHERE id = ${application.projectId} FOR UPDATE`
    const current = await tx.candidateApplication.findUnique({ where: { id: application.id } })
    if (!current) throw new ApiError(404, 'Candidate not found')
    if (current.stage !== application.stage || current.status !== application.status) {
      throw new ApiError(409, 'Candidate changed. Reload before applying this action.')
    }
    assertTransitionAllowed(current, action, actorRole)
    const updateData: Prisma.CandidateApplicationUpdateInput = {}
    let title = ''
    let subtitle: string | null = null
    const eventType = action

    if (action === 'mark_contact_successful') {
      updateData.status = 'scheduled'
      title = application.stage === 'pre_interview' ? 'Pre-Interview Conducted Successfully' : 'Contact Successful'
      subtitle = input.notes ?? null
      await createContactAttempt(tx, application, 'contact_successful', actorUserId, now, input.notes)
    }

    if (action === 'mark_not_reached') {
      updateData.status = 'not_reached'
      title = 'Contact Attempt Logged'
      subtitle = input.notes ?? 'Candidate was not reached.'
      await createContactAttempt(tx, application, 'not_reached', actorUserId, now, input.notes)
    }

    if (action === 'withdraw') {
      updateData.status = 'withdrawn'
      updateData.closedAt = now
      updateData.closureReason = 'Candidate withdrew from the process.'
      title = 'Candidate Withdrawn'
      subtitle = input.notes ?? 'Candidate withdrew from the process.'
      await createContactAttempt(tx, application, 'withdrawn', actorUserId, now, input.notes)
    }

    if (action === 'move_to_department_interview') {
      updateData.stage = 'department_interview'
      updateData.status = 'waiting_for_contact'
      title = 'Moved to Department Interview Stage'
      subtitle = input.notes ?? null
    }

    if (action === 'schedule_department_interview') {
      updateData.status = 'scheduled'
      title = 'Department Interview Scheduled'
      subtitle = input.notes ?? null
      await createContactAttempt(tx, application, 'scheduled', actorUserId, now, input.notes)
      await createInterview(tx, application.id, application.projectId, 'department_interview', actorUserId, input.interviewStartAt, input.meetingUrl)
    }

    if (action === 'move_to_hr_interview') {
      updateData.stage = 'hr_interview'
      updateData.status = 'waiting_for_contact'
      title = 'Moved to HR Interview Stage'
      subtitle = input.notes ?? null
    }

    if (action === 'schedule_hr_interview') {
      updateData.status = 'scheduled'
      title = 'HR Interview Scheduled'
      subtitle = input.notes ?? null
      await createContactAttempt(tx, application, 'scheduled', actorUserId, now, input.notes)
      await createInterview(tx, application.id, application.projectId, 'hr_interview', actorUserId, input.interviewStartAt, input.meetingUrl)
    }

    if (action === 'send_assessment') {
      updateData.status = 'assessment_sent'
      title = 'Assessment Sent'
      subtitle = input.notes ?? null
    }

    if (action === 'move_to_candidate_review') {
      updateData.stage = 'manager_review'
      updateData.status = 'waitlisted'
      title = 'Moved to Candidate Review'
      subtitle = input.notes ?? null
    }

    if (action === 'approve_for_offer') {
      updateData.stage = 'offer_stage'
      updateData.status = 'approved_for_offer'
      title = 'Approved for Offer'
      subtitle = input.notes ?? null
      await ensureOfferQueueItem(tx, application.id, application.projectId, 'waiting')
    }

    if (action === 'waitlist') {
      updateData.status = 'waitlisted'
      title = 'Candidate Waitlisted'
      subtitle = input.notes ?? null
    }

    if (action === 'send_final_check') {
      updateData.status = 'final_check_sent'
      title = 'Final Check Sent'
      subtitle = input.notes ?? null
      const queueItem = await ensureOfferQueueItem(tx, application.id, application.projectId, 'active')
      await upsertOffer(tx, application.id, application.projectId, queueItem.id, 'final_check_sent', actorUserId, now)
    }

    if (action === 'send_offer') {
      updateData.status = 'offer_sent'
      title = 'Offer Sent'
      subtitle = input.notes ?? null
      const queueItem = await ensureOfferQueueItem(tx, application.id, application.projectId, 'active')
      await upsertOffer(tx, application.id, application.projectId, queueItem.id, 'offer_sent', actorUserId, now)
    }

    if (action === 'offer_accepted') {
      const project = await tx.project.findUniqueOrThrow({
        where: { id: application.projectId },
        select: {
          hiredApplicationId: true,
          applications: { where: { status: 'offer_accepted' }, select: { id: true }, take: 1 },
          offers: { where: { status: 'offer_accepted' }, select: { id: true }, take: 1 },
        },
      })
      if (project.hiredApplicationId || project.applications.length || project.offers.length) {
        throw new ApiError(409, 'This project already has a hire. Only one hire is allowed per project.')
      }
      updateData.status = 'offer_accepted'
      title = 'Offer Accepted'
      subtitle = input.notes ?? null
      const queueItem = await ensureOfferQueueItem(tx, application.id, application.projectId, 'accepted')
      await upsertOffer(tx, application.id, application.projectId, queueItem.id, 'offer_accepted', actorUserId, now)
      await tx.project.update({
        where: { id: application.projectId },
        data: { hiredApplicationId: application.id, status: 'closed', closedAt: now },
      })
    }

    if (action === 'reject') {
      updateData.status = application.stage === 'offer_stage' ? 'offer_rejected' : 'rejected'
      updateData.closedAt = now
      updateData.closureReason = 'Rejected from workflow.'
      title = application.stage === 'offer_stage' ? 'Offer Rejected' : 'Candidate Rejected'
      subtitle = input.notes ?? null
      await tx.rejectionFollowUp.upsert({
        where: { candidateApplicationId: application.id },
        create: {
          candidateApplicationId: application.id,
          projectId: application.projectId,
          reason: 'rejected',
          eligibleAt: now,
        },
        update: {
          status: 'waiting_for_contact',
          reason: 'rejected',
          eligibleAt: now,
          handledAt: null,
        },
      })
    }

    if (!title) throw new ApiError(400, `Unsupported transition action: ${action}`)

    await tx.candidateApplication.update({
      where: { id: application.id },
      data: updateData,
    })

    await tx.activityEvent.create({
      data: {
        candidateApplicationId: application.id,
        projectId: application.projectId,
        eventType,
        title,
        subtitle,
        actorUserId,
        actorRole,
        occurredAt: now,
      },
    })
  })
}

async function createContactAttempt(
  tx: Prisma.TransactionClient,
  application: Pick<CandidateApplicationWithResponse, 'id' | 'stage'>,
  result: 'contact_successful' | 'not_reached' | 'withdrawn' | 'scheduled',
  actorUserId: string,
  attemptedAt: Date,
  notes?: string,
) {
  await tx.contactAttempt.create({
    data: {
      candidateApplicationId: application.id,
      context: getContactContext(application.stage),
      result,
      attemptedAt,
      notes,
      createdByUserId: actorUserId,
    },
  })
}

async function createInterview(
  tx: Prisma.TransactionClient,
  candidateApplicationId: string,
  projectId: string,
  type: 'department_interview' | 'hr_interview',
  actorUserId: string,
  interviewStartAt: Date | undefined,
  meetingUrl?: string,
) {
  if (!interviewStartAt || !meetingUrl) throw new ApiError(400, 'Interview date, time and meeting URL are required')
  const scheduledStartAt = new Date(interviewStartAt)
  const scheduledEndAt = new Date(scheduledStartAt)
  scheduledEndAt.setHours(scheduledEndAt.getHours() + 1)

  await tx.interview.create({
    data: {
      candidateApplicationId,
      projectId,
      type,
      scheduledStartAt,
      scheduledEndAt,
      timezone: 'Europe/Istanbul',
      meetingUrl,
      createdByUserId: actorUserId,
    },
  })
}

async function ensureOfferQueueItem(
  tx: Prisma.TransactionClient,
  candidateApplicationId: string,
  projectId: string,
  status: 'waiting' | 'active' | 'accepted',
) {
  const existing = await tx.projectOfferQueueItem.findUnique({
    where: { candidateApplicationId },
  })

  if (existing) {
    return tx.projectOfferQueueItem.update({
      where: { id: existing.id },
      data: { status },
    })
  }

  const rank = await tx.projectOfferQueueItem.aggregate({
    where: { projectId },
    _max: { rank: true },
  })

  return tx.projectOfferQueueItem.create({
    data: {
      candidateApplicationId,
      projectId,
      rank: (rank._max.rank ?? 0) + 1,
      status,
    },
  })
}

async function upsertOffer(
  tx: Prisma.TransactionClient,
  candidateApplicationId: string,
  projectId: string,
  offerQueueItemId: string,
  status: 'final_check_sent' | 'offer_sent' | 'offer_accepted',
  actorUserId: string,
  now: Date,
) {
  const existing = await tx.offer.findFirst({
    where: { candidateApplicationId },
    orderBy: { createdAt: 'desc' },
  })
  const timestamps = {
    finalCheckSentAt: status === 'final_check_sent' ? now : undefined,
    offerSentAt: status === 'offer_sent' ? now : undefined,
    respondedAt: status === 'offer_accepted' ? now : undefined,
  }

  if (existing) {
    return tx.offer.update({
      where: { id: existing.id },
      data: { status, offerQueueItemId, ...timestamps },
    })
  }

  return tx.offer.create({
    data: {
      candidateApplicationId,
      projectId,
      offerQueueItemId,
      status,
      createdByUserId: actorUserId,
      ...timestamps,
    },
  })
}

function getContactContext(stage: string) {
  if (stage === 'pre_interview') return 'pre_interview'
  if (stage === 'department_interview') return 'department_interview'
  if (stage === 'hr_interview') return 'hr_interview'
  throw new ApiError(409, 'Contact attempts are not supported in this stage')
}
