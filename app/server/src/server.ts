import 'dotenv/config'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import Fastify from 'fastify'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { createDummyAuthService } from './auth.js'
import { prisma } from './db.js'
import {
  CandidateTransitionSchema,
  CandidateStageSchema,
  CreateProjectSchema,
  ListCandidatesQuerySchema,
  ListProjectsQuerySchema,
  ListUsersQuerySchema,
  UpdateProjectStageCommentSchema,
  UpdateProjectSchema,
} from './domain.js'

const app = Fastify({ logger: true })
const authService = createDummyAuthService(prisma)

class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message)
  }
}

const projectResponseInclude = Prisma.validator<Prisma.ProjectInclude>()({
  _count: { select: { applications: true } },
  externalReferences: true,
  members: { include: { user: true } },
  stageComments: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'asc' } },
  offers: {
    where: { status: 'offer_accepted' },
    select: { id: true },
    take: 1,
  },
})

type ProjectWithResponse = Prisma.ProjectGetPayload<{ include: typeof projectResponseInclude }>

const candidateResponseInclude = Prisma.validator<Prisma.CandidateApplicationInclude>()({
  candidate: true,
  interviews: { orderBy: { scheduledStartAt: 'desc' } },
  notes: {
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { id: true, name: true, role: true } } },
  },
  activityEvents: { orderBy: { occurredAt: 'asc' } },
  contactAttempts: { orderBy: { attemptedAt: 'desc' } },
  _count: { select: { contactAttempts: true } },
})

type CandidateApplicationWithResponse = Prisma.CandidateApplicationGetPayload<{ include: typeof candidateResponseInclude }>

await app.register(helmet)
await app.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()) ?? [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ],
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'OPTIONS'],
})

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({ error: 'Validation failed', details: error.issues })
  }

  if (error instanceof ApiError) {
    return reply.status(error.statusCode).send({ error: error.message })
  }

  const statusCode = (error as { statusCode?: unknown }).statusCode
  if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
    const message = error instanceof Error ? error.message : 'Request failed'
    return reply.status(statusCode).send({ error: message })
  }

  app.log.error(error)
  return reply.status(500).send({ error: 'Internal server error' })
})

app.get('/health', async () => ({ ok: true }))

app.get('/auth/me', async (request) => authService.getSession(request))

app.get('/users', async (request) => {
  const query = ListUsersQuerySchema.parse(request.query)

  return prisma.user.findMany({
    where: {
      active: true,
      role: query.role,
    },
    orderBy: { name: 'asc' },
  })
})

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
  const session = await authService.requireAppRole(request, ['admin', 'hr', 'hm'])
  const { projectId, stage } = request.params as { projectId: string; stage: string }
  const parsedStage = CandidateStageSchema.parse(stage)
  const input = UpdateProjectStageCommentSchema.parse(request.body)
  const authorRole = session.appRole === 'hm' ? 'hiring_manager' : 'hr'

  await requireProject(projectId)

  const existing = await prisma.projectStageComment.findFirst({
    where: {
      projectId,
      stage: parsedStage,
      authorUserId: session.userId,
      authorRole,
    },
    select: { id: true },
  })

  if (existing) {
    await prisma.projectStageComment.update({
      where: { id: existing.id },
      data: { body: input.body },
    })
  } else {
    await prisma.projectStageComment.create({
      data: {
        projectId,
        stage: parsedStage,
        authorUserId: session.userId,
        authorRole,
        body: input.body,
      },
    })
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: projectResponseInclude,
  })

  if (!project) return reply.status(404).send({ error: 'Project not found' })
  return toProjectResponse(project)
})

app.post('/projects', async (request, reply) => {
  await authService.requireAppRole(request, ['admin', 'hr'])
  const input = CreateProjectSchema.parse(request.body)
  const assignment = await validateProjectAssignment(input.hiringManagerUserIds, input.assignedHrUserIds)

  const project = await prisma.project.create({
    data: {
      name: input.name,
      position: input.position,
      notes: input.notes,
      members: {
        create: [
          ...assignment.hiringManagerUserIds.map((userId) => ({ userId, projectRole: 'hiring_manager' as const })),
          ...assignment.assignedHrUserIds.map((userId) => ({ userId, projectRole: 'hr' as const })),
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
  await authService.requireAppRole(request, ['admin', 'hr'])
  const { projectId } = request.params as { projectId: string }
  const input = UpdateProjectSchema.parse(request.body)
  const assignment = await validateProjectAssignment(input.hiringManagerUserIds, input.assignedHrUserIds)

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
        notes: input.notes,
        members: {
          create: [
            ...assignment.hiringManagerUserIds.map((userId) => ({ userId, projectRole: 'hiring_manager' as const })),
            ...assignment.assignedHrUserIds.map((userId) => ({ userId, projectRole: 'hr' as const })),
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
  await authService.requireAppRole(request, ['admin', 'hr'])
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

app.get('/candidates', async (request) => {
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

  return applications.map(toCandidateResponse)
})

app.get('/candidates/:candidateId', async (request, reply) => {
  const { candidateId } = request.params as { candidateId: string }
  const application = await prisma.candidateApplication.findFirst({
    where: {
      OR: [{ id: candidateId }, { candidateId }],
    },
    include: candidateResponseInclude,
  })

  if (!application) return reply.status(404).send({ error: 'Candidate not found' })
  return toCandidateResponse(application)
})

app.post('/candidates/:candidateId/transition', async (request, reply) => {
  const session = await authService.requireAppRole(request, ['admin', 'hr', 'hm'])
  const { candidateId } = request.params as { candidateId: string }
  const input = CandidateTransitionSchema.parse(request.body)
  const application = await prisma.candidateApplication.findFirst({
    where: { OR: [{ id: candidateId }, { candidateId }] },
    select: {
      id: true,
      projectId: true,
      stage: true,
      status: true,
    },
  })

  if (!application) return reply.status(404).send({ error: 'Candidate not found' })

  await applyCandidateTransition(application, input, session.userId, session.role)

  const updated = await prisma.candidateApplication.findUnique({
    where: { id: application.id },
    include: candidateResponseInclude,
  })

  if (!updated) return reply.status(404).send({ error: 'Candidate not found' })
  return toCandidateResponse(updated)
})

async function applyCandidateTransition(
  application: Pick<CandidateApplicationWithResponse, 'id' | 'projectId' | 'stage' | 'status'>,
  input: ReturnType<typeof CandidateTransitionSchema.parse>,
  actorUserId: string,
  actorRole: CandidateApplicationWithResponse['activityEvents'][number]['actorRole'],
) {
  const now = input.occurredAt ?? new Date()
  const action = input.action

  await prisma.$transaction(async (tx) => {
    const updateData: Prisma.CandidateApplicationUpdateInput = {}
    let title = ''
    let subtitle: string | null = null
    let eventType = action

    if (action === 'mark_contact_successful') {
      updateData.status = 'scheduled'
      title = application.stage === 'pre_interview' ? 'Pre-Interview Conducted Successfully' : 'Contact Successful'
      subtitle = input.notes ?? defaultActivitySubtitle(action, application.stage)
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
      subtitle = input.notes ?? defaultActivitySubtitle(action, application.stage)
    }

    if (action === 'schedule_department_interview') {
      updateData.status = 'scheduled'
      title = 'Department Interview Scheduled'
      subtitle = input.notes ?? defaultActivitySubtitle(action, application.stage)
      await createContactAttempt(tx, application, 'scheduled', actorUserId, now, input.notes)
      await createInterview(tx, application.id, application.projectId, 'department_interview', actorUserId, input.interviewStartAt ?? now, input.meetingUrl)
    }

    if (action === 'move_to_hr_interview') {
      updateData.stage = 'hr_interview'
      updateData.status = 'waiting_for_contact'
      title = 'Moved to HR Interview Stage'
      subtitle = input.notes ?? defaultActivitySubtitle(action, application.stage)
    }

    if (action === 'schedule_hr_interview') {
      updateData.status = 'scheduled'
      title = 'HR Interview Scheduled'
      subtitle = input.notes ?? defaultActivitySubtitle(action, application.stage)
      await createContactAttempt(tx, application, 'scheduled', actorUserId, now, input.notes)
      await createInterview(tx, application.id, application.projectId, 'hr_interview', actorUserId, input.interviewStartAt ?? now, input.meetingUrl)
    }

    if (action === 'send_assessment') {
      updateData.status = 'assessment_sent'
      title = 'Assessment Sent'
      subtitle = input.notes ?? defaultActivitySubtitle(action, application.stage)
    }

    if (action === 'move_to_candidate_review') {
      updateData.stage = 'manager_review'
      updateData.status = 'waitlisted'
      title = 'Moved to Candidate Review'
      subtitle = input.notes ?? defaultActivitySubtitle(action, application.stage)
    }

    if (action === 'approve_for_offer') {
      updateData.stage = 'offer_stage'
      updateData.status = 'approved_for_offer'
      title = 'Approved for Offer'
      subtitle = input.notes ?? defaultActivitySubtitle(action, application.stage)
      await ensureOfferQueueItem(tx, application.id, application.projectId, 'waiting')
    }

    if (action === 'waitlist') {
      updateData.status = 'waitlisted'
      title = 'Candidate Waitlisted'
      subtitle = input.notes ?? defaultActivitySubtitle(action, application.stage)
    }

    if (action === 'send_final_check') {
      updateData.status = 'final_check_sent'
      title = 'Final Check Sent'
      subtitle = input.notes ?? defaultActivitySubtitle(action, application.stage)
      const queueItem = await ensureOfferQueueItem(tx, application.id, application.projectId, 'active')
      await upsertOffer(tx, application.id, application.projectId, queueItem.id, 'final_check_sent', actorUserId, now)
    }

    if (action === 'send_offer') {
      updateData.status = 'offer_sent'
      title = 'Offer Sent'
      subtitle = input.notes ?? defaultActivitySubtitle(action, application.stage)
      const queueItem = await ensureOfferQueueItem(tx, application.id, application.projectId, 'active')
      await upsertOffer(tx, application.id, application.projectId, queueItem.id, 'offer_sent', actorUserId, now)
    }

    if (action === 'offer_accepted') {
      updateData.status = 'offer_accepted'
      title = 'Offer Accepted'
      subtitle = input.notes ?? defaultActivitySubtitle(action, application.stage)
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
      subtitle = input.notes ?? defaultActivitySubtitle(action, application.stage)
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
  interviewStartAt: Date,
  meetingUrl?: string,
) {
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
      meetingUrl: meetingUrl ?? `https://meet.example.com/${candidateApplicationId}-${type}`,
      createdByUserId: actorUserId,
    },
  })
}

function defaultActivitySubtitle(action: string, stage: string) {
  if (action === 'mark_contact_successful') return 'Contact attempt completed.'
  if (action === 'move_to_department_interview') return 'Candidate moved from Pre-Interview to Department Interview.'
  if (action === 'schedule_department_interview') return 'Department interview scheduled.'
  if (action === 'move_to_hr_interview') return 'Candidate moved from Department Interview to HR Interview.'
  if (action === 'schedule_hr_interview') return 'HR interview scheduled.'
  if (action === 'send_assessment') return 'Assessment sent to candidate.'
  if (action === 'move_to_candidate_review') return 'Candidate moved to review.'
  if (action === 'approve_for_offer') return 'Candidate approved for offer.'
  if (action === 'waitlist') return 'Candidate added to waitlist.'
  if (action === 'send_final_check') return 'Final check sent to candidate.'
  if (action === 'send_offer') return 'Offer sent to candidate.'
  if (action === 'offer_accepted') return 'Offer accepted by candidate.'
  if (action === 'reject') return 'Candidate rejected from workflow.'
  return `Contact activity for ${stage.replaceAll('_', ' ')}.`
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
  if (stage === 'department_interview') return 'department_interview'
  if (stage === 'hr_interview') return 'hr_interview'
  return 'pre_interview'
}

function toCandidateResponse(application: CandidateApplicationWithResponse) {
  const interview = application.interviews[0]

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
    notes: application.notes.map((note) => ({
      id: note.id,
      authorRole: note.authorRole,
      visibility: note.visibility,
      body: note.body,
      fields: note.fields,
      createdAt: note.createdAt,
      author: note.author,
    })),
    activity: application.activityEvents.map((event, index) => ({
      id: event.id,
      index: index + 1,
      title: event.title,
      subtitle: event.subtitle,
      actorRole: event.actorRole,
      occurredAt: event.occurredAt,
      createdAt: event.createdAt,
    })),
    contactLogs: application.contactAttempts,
  }
}

function toProjectResponse(project: ProjectWithResponse) {
  const hiringManagerMembers = project.members.filter((member) => member.projectRole === 'hiring_manager')
  const assignedHrMembers = project.members.filter((member) => member.projectRole === 'hr')
  const linkedinReference = project.externalReferences.find(
    (reference) => reference.provider === 'linkedin' && reference.resourceType === 'project',
  )

  return {
    ...project,
    candidateCount: project._count.applications,
    hasAcceptedOffer: project.offers.length > 0,
    hiringManager: hiringManagerMembers.map((member) => member.user.name).join(', '),
    hiringManagerUserIds: hiringManagerMembers.map((member) => member.userId),
    assignedHr: assignedHrMembers.map((member) => member.user.name),
    assignedHrUserIds: assignedHrMembers.map((member) => member.userId),
    linkedinProjectId: linkedinReference?.externalId,
    importMode: getImportMode(linkedinReference?.metadata),
  }
}

function getImportMode(metadata: Prisma.JsonValue | undefined) {
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) return 'auto_sync'
  const value = (metadata as { importMode?: unknown }).importMode
  return value === 'manual_import' ? 'manual_import' : 'auto_sync'
}

async function requireProject(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } })
  if (!project) throw new ApiError(404, 'Project not found')
}

async function validateProjectAssignment(hiringManagerUserIds: string[], assignedHrUserIds: string[]) {
  const normalizedHiringManagerUserIds = uniqueIds(hiringManagerUserIds)
  const normalizedAssignedHrUserIds = uniqueIds(assignedHrUserIds)
  const requestedUserIds = uniqueIds([...normalizedHiringManagerUserIds, ...normalizedAssignedHrUserIds])

  const users = await prisma.user.findMany({
    where: { id: { in: requestedUserIds }, active: true },
    select: { id: true, role: true },
  })
  const usersById = new Map(users.map((user) => [user.id, user]))

  const missingUserIds = requestedUserIds.filter((userId) => !usersById.has(userId))
  if (missingUserIds.length > 0) {
    throw new ApiError(400, `Unknown or inactive users: ${missingUserIds.join(', ')}`)
  }

  const invalidHiringManagers = normalizedHiringManagerUserIds.filter(
    (userId) => usersById.get(userId)?.role !== 'hiring_manager',
  )
  if (invalidHiringManagers.length > 0) {
    throw new ApiError(400, `Users are not hiring managers: ${invalidHiringManagers.join(', ')}`)
  }

  const invalidHrUsers = normalizedAssignedHrUserIds.filter((userId) => usersById.get(userId)?.role !== 'hr_manager')
  if (invalidHrUsers.length > 0) {
    throw new ApiError(400, `Users are not HR users: ${invalidHrUsers.join(', ')}`)
  }

  return {
    hiringManagerUserIds: normalizedHiringManagerUserIds,
    assignedHrUserIds: normalizedAssignedHrUserIds,
  }
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids)]
}

const port = Number(process.env.PORT ?? 4000)
const host = process.env.HOST ?? '0.0.0.0'

try {
  await app.listen({ port, host })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
