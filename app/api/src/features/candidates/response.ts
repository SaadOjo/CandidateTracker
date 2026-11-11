import { Prisma, type Role } from '@prisma/client'
import { visibleNotes } from './note-visibility.js'

export const candidateResponseInclude = Prisma.validator<Prisma.CandidateApplicationInclude>()({
  candidate: true,
  interviews: { orderBy: { scheduledStartAt: 'desc' } },
  notes: {
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { id: true, name: true, role: true } } },
  },
  activityEvents: {
    orderBy: { occurredAt: 'asc' },
    include: { actor: { select: { id: true, name: true, role: true } } },
  },
  contactAttempts: { orderBy: { attemptedAt: 'desc' } },
  rejectionFollowUp: true,
  _count: { select: { contactAttempts: true } },
})

export type CandidateApplicationWithResponse = Prisma.CandidateApplicationGetPayload<{ include: typeof candidateResponseInclude }>

export function toCandidateResponse(application: CandidateApplicationWithResponse, role: Role) {
  const interview = application.interviews.find((item) => item.type === application.stage && item.status === 'scheduled')

  return {
    id: application.id,
    candidateId: application.candidateId,
    projectId: application.projectId,
    name: application.candidate.fullName,
    source: application.candidate.source,
    linkedinProfileUrl: application.candidate.linkedinProfileUrl,
    email: application.candidate.email,
    phone: application.candidate.phone,
    stage: application.stage,
    status: application.status,
    appliedAgo: application.appliedLabel,
    contactAttempts: application._count.contactAttempts,
    interview: interview
      ? {
          title: interview.type === 'hr_interview' ? 'Scheduled HR Interview' : 'Scheduled Department Interview',
          date: interview.scheduledStartAt.toISOString(),
          time: interview.scheduledEndAt
            ? `${interview.scheduledStartAt.toISOString()} - ${interview.scheduledEndAt.toISOString()}`
            : interview.scheduledStartAt.toISOString(),
          timezone: interview.timezone,
          meetingUrl: interview.meetingUrl,
        }
      : null,
    notes: visibleNotes(application.notes, role).map((note) => ({
      id: note.id,
      authorRole: note.authorRole,
      visibility: note.visibility,
      body: note.body,
      fields: note.fields,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      author: note.author,
    })),
    activity: application.activityEvents.map((event, index) => ({
      id: event.id,
      index: index + 1,
      title: event.title,
      subtitle: event.subtitle,
      actorRole: event.actorRole,
      actor: event.actor,
      occurredAt: event.occurredAt,
      createdAt: event.createdAt,
    })),
    contactLogs: application.contactAttempts,
    rejectionFollowUp: application.rejectionFollowUp
      ? {
          id: application.rejectionFollowUp.id,
          status: application.rejectionFollowUp.status,
          reason: application.rejectionFollowUp.reason,
          eligibleAt: application.rejectionFollowUp.eligibleAt,
          handledAt: application.rejectionFollowUp.handledAt,
        }
      : null,
  }
}
