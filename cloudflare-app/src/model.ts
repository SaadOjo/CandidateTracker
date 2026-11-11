import { ApiError } from '../../app/api/src/errors'
import { assertTransitionAllowed } from '../../app/api/src/features/candidates/transition-policy'
import { visibleNotes } from '../../app/api/src/features/candidates/note-visibility'
import { sourceProjectKey } from '../../app/api/src/features/simulator-import/contract'
import type { SimulatorProject } from '../../app/api/src/features/simulator-import/contract'
import type { CandidateTransitionSchema, CreateProjectSchema, UpsertCandidateNoteSchema } from '../../app/api/src/domain'
import type { z } from 'zod'
import type { CandidateActivityEvent, ContactLog, PipelineStage } from '../../app/web/src/domain/types'
import type { DemoUser, StoredCandidate, StoredProject, Workspace } from './storage'

export const users: DemoUser[] = [
  { id: 'demo-serenay', name: 'Serenay', email: 'serenay@example.com', role: 'human_resource', active: true },
  { id: 'demo-ayca', name: 'Ayca', email: 'ayca@example.com', role: 'hiring_manager', active: true },
]
export const now = () => new Date().toISOString()
export const id = () => crypto.randomUUID()
export const actor = (user: DemoUser) => ({ id: user.id, name: user.name, role: user.role })
export function requireRole(user: DemoUser, role: DemoUser['role']) {
  if (user.role !== role) throw new ApiError(403, `This action requires the ${role} role`)
}
export function projectById(state: Workspace, projectId: string) {
  const project = state.projects.find(item => item.id === projectId)
  if (!project) throw new ApiError(404, 'Project not found')
  return project
}
export function candidateById(state: Workspace, candidateId: string) {
  const candidate = state.candidates.find(item => item.id === candidateId)
  if (!candidate) throw new ApiError(404, 'Candidate not found')
  return candidate
}
export function projectResponse(state: Workspace, project: StoredProject) {
  const { sourceKey: _sourceKey, hiredApplicationId: _hire, ...result } = project
  return { ...result, candidateCount: state.candidates.filter(item => item.projectId === project.id).length, hasAcceptedOffer: Boolean(project.hiredApplicationId) }
}
export function candidateResponse(candidate: StoredCandidate, user: DemoUser) {
  const { sourceKey: _sourceKey, interviewStage, createdAt: _createdAt, ...result } = candidate
  const notes = candidate.notes.map(note => ({ ...note, fields: note.fields ?? null }))
  return { ...result, notes: visibleNotes(notes, user.role), interview: candidate.stage === interviewStage ? candidate.interview : null,
    activity: [...candidate.activity].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)) }
}
export function assignment(input: { hiringManagerUserIds: string[]; assignedHumanResourceUserIds: string[] }) {
  const hiringManagerUserIds = [...new Set(input.hiringManagerUserIds)]
  const assignedHumanResourceUserIds = [...new Set(input.assignedHumanResourceUserIds)]
  for (const [ids, role] of [[hiringManagerUserIds, 'hiring_manager'], [assignedHumanResourceUserIds, 'human_resource']] as const) {
    if (!ids.length || ids.some(userId => !users.some(user => user.id === userId && user.role === role))) throw new ApiError(400, 'Invalid project assignment')
  }
  return { hiringManagerUserIds, assignedHumanResourceUserIds,
    hiringManager: users.filter(user => hiringManagerUserIds.includes(user.id)).map(user => user.name).join(', '),
    assignedHumanResources: users.filter(user => assignedHumanResourceUserIds.includes(user.id)).map(user => user.name) }
}
export function createProject(state: Workspace, input: z.infer<typeof CreateProjectSchema>) {
  const project: StoredProject = { ...input, ...assignment(input), id: id(), status: 'active', createdAt: now(), candidateCount: 0, hasAcceptedOffer: false, stageComments: [], simulatorTracking: null }
  state.projects.push(project)
  return project
}
export function importProject(state: Workspace, snapshot: SimulatorProject, input: { hiringManagerUserIds: string[]; assignedHumanResourceUserIds: string[] }) {
  if (state.projects.some(project => project.sourceKey === sourceProjectKey(snapshot))) throw new ApiError(409, 'This simulator project is already imported')
  const project = createProject(state, { ...input, name: snapshot.project.name, position: snapshot.project.position, importMode: 'auto_sync' })
  project.sourceKey = sourceProjectKey(snapshot)
  syncCandidates(state, project, snapshot)
  return project
}
export function syncCandidates(state: Workspace, project: StoredProject, snapshot: SimulatorProject) {
  if (project.sourceKey !== sourceProjectKey(snapshot)) throw new ApiError(409, 'Simulator project identity does not match the tracked project')
  if (project.status !== 'active' || project.hiredApplicationId) throw new ApiError(409, 'Only active projects without a hire can import candidates')
  let imported = 0
  for (const profile of snapshot.candidates) {
    const sourceKey = JSON.stringify([snapshot.integrationContext, profile.member])
    let person = state.people.find(item => item.sourceKey === sourceKey)
    if (!person && profile.stage !== 'shortlisted') continue
    if (!person) {
      person = { id: id(), sourceKey, name: `${profile.firstName} ${profile.lastName}`, linkedinProfileUrl: profile.profileUrl, email: profile.email ?? null, phone: profile.phone ?? null }
      state.people.push(person)
    }
    if (!person.email && profile.email) person.email = profile.email
    if (!person.phone && profile.phone) person.phone = profile.phone
    for (const candidate of state.candidates.filter(item => item.candidateId === person.id)) {
      if (!candidate.email) candidate.email = person.email
      if (!candidate.phone) candidate.phone = person.phone
    }
    if (profile.stage !== 'shortlisted' || state.candidates.some(item => item.projectId === project.id && item.candidateId === person.id)) continue
    const timestamp = now()
    state.candidates.push({ id: id(), candidateId: person.id, projectId: project.id, sourceKey,
      name: person.name, source: 'linkedin', linkedinProfileUrl: person.linkedinProfileUrl, email: person.email, phone: person.phone,
      stage: 'pre_interview', status: 'waiting_for_contact', createdAt: timestamp, contactAttempts: 0, notes: [], contactLogs: [], interview: null,
      activity: [{ id: id(), title: 'Candidate Imported', subtitle: 'RSC simulator: shortlisted', occurredAt: timestamp, createdAt: timestamp, actor: null, actorRole: null }] })
    imported++
  }
  project.simulatorTracking = { sourceProjectId: snapshot.project.id, integrationContext: snapshot.integrationContext, sourceStage: 'shortlisted', lastSyncedAt: now(), lastError: null,
    sourceCandidateCount: snapshot.candidates.length, matchingCandidateCount: snapshot.candidates.filter(person => person.stage === 'shortlisted').length }
  return imported
}
export function saveNote(candidate: StoredCandidate, user: DemoUser, input: z.infer<typeof UpsertCandidateNoteSchema>) {
  const existing = candidate.notes.find(note => note.author.id === user.id)
  const timestamp = now()
  const note = { id: existing?.id ?? id(), authorRole: user.role, author: actor(user), body: input.body ?? null, fields: input.fields ?? null,
    visibility: input.visibility, createdAt: existing?.createdAt ?? timestamp, updatedAt: timestamp }
  candidate.notes = [note, ...candidate.notes.filter(item => item.id !== note.id)]
}
export function saveComment(project: StoredProject, stage: PipelineStage, user: DemoUser, body: string) {
  if (stage === 'pre_interview') requireRole(user, 'hiring_manager')
  const comments = project.stageComments ?? []
  const existing = comments.find(comment => comment.stage === stage && comment.author?.id === user.id)
  if (existing) existing.body = body
  else comments.push({ id: id(), stage, authorRole: user.role, author: actor(user), body, createdAt: now() })
  project.stageComments = comments
}
function activity(candidate: StoredCandidate, user: DemoUser, title: string, subtitle: string | null, occurredAt: string) {
  const event: CandidateActivityEvent = { id: id(), title, subtitle, occurredAt, createdAt: now(), actor: actor(user), actorRole: user.role }
  candidate.activity.push(event)
}
function contact(candidate: StoredCandidate, result: string, attemptedAt: string, notes?: string, context = 'pipeline') {
  const log: ContactLog = { id: id(), context, result, attemptedAt, notes: notes ?? null }
  candidate.contactLogs = [log, ...(candidate.contactLogs ?? [])]
  candidate.contactAttempts++
}
export function transition(state: Workspace, candidate: StoredCandidate, user: DemoUser, input: z.infer<typeof CandidateTransitionSchema>) {
  assertTransitionAllowed(candidate, input.action, user.role)
  const occurredAt = input.occurredAt?.toISOString() ?? now()
  let title = ''
  let subtitle = input.notes ?? null
  switch (input.action) {
    case 'mark_contact_successful':
      candidate.status = 'scheduled'; title = 'Pre-Interview Conducted Successfully'
      contact(candidate, 'contact_successful', occurredAt, input.notes); break
    case 'mark_not_reached':
      candidate.status = 'not_reached'; title = 'Contact Attempt Logged'; subtitle ??= 'Candidate was not reached.'
      contact(candidate, 'not_reached', occurredAt, input.notes); break
    case 'withdraw':
      candidate.status = 'withdrawn'; title = 'Candidate Withdrawn'; subtitle ??= 'Candidate withdrew from the process.'
      contact(candidate, 'withdrawn', occurredAt, input.notes); break
    case 'move_to_department_interview':
      candidate.stage = 'department_interview'; candidate.status = 'waiting_for_contact'; title = 'Moved to Department Interview Stage'; break
    case 'move_to_hr_interview':
      candidate.stage = 'hr_interview'; candidate.status = 'waiting_for_contact'; title = 'Moved to HR Interview Stage'; break
    case 'schedule_department_interview':
    case 'schedule_hr_interview': {
      const hr = input.action === 'schedule_hr_interview'
      candidate.status = 'scheduled'; title = hr ? 'HR Interview Scheduled' : 'Department Interview Scheduled'
      const date = input.interviewStartAt!.toISOString()
      candidate.interviewStage = candidate.stage
      candidate.interview = { title: hr ? 'Scheduled HR Interview' : 'Scheduled Department Interview', date, time: date, timezone: 'Europe/Istanbul', meetingUrl: input.meetingUrl }
      contact(candidate, 'scheduled', occurredAt, input.notes); break
    }
    case 'send_assessment': candidate.status = 'assessment_sent'; title = 'Assessment Sent'; break
    case 'move_to_candidate_review': candidate.stage = 'manager_review'; candidate.status = 'waitlisted'; title = 'Moved to Candidate Review'; break
    case 'approve_for_offer': candidate.stage = 'offer_stage'; candidate.status = 'approved_for_offer'; title = 'Approved for Offer'; break
    case 'waitlist': candidate.status = 'waitlisted'; title = 'Candidate Waitlisted'; break
    case 'send_final_check': candidate.status = 'final_check_sent'; title = 'Final Check Sent'; break
    case 'send_offer': candidate.status = 'offer_sent'; title = 'Offer Sent'; break
    case 'offer_accepted': {
      const project = projectById(state, candidate.projectId)
      if (project.hiredApplicationId || state.candidates.some(item => item.projectId === project.id && item.status === 'offer_accepted')) throw new ApiError(409, 'This project already has a hire. Only one hire is allowed per project.')
      candidate.status = 'offer_accepted'; project.status = 'closed'; project.hiredApplicationId = candidate.id; title = 'Offer Accepted'; break
    }
    case 'reject':
      candidate.status = candidate.stage === 'offer_stage' ? 'offer_rejected' : 'rejected'
      title = candidate.stage === 'offer_stage' ? 'Offer Rejected' : 'Candidate Rejected'
      candidate.rejectionFollowUp = { id: id(), status: 'waiting_for_contact', reason: 'rejected', eligibleAt: occurredAt, handledAt: null }; break
    default: throw new ApiError(400, 'Unsupported transition')
  }
  activity(candidate, user, title, subtitle, occurredAt)
}
export function rejectionResponse(state: Workspace, candidate: StoredCandidate) {
  if (!candidate.rejectionFollowUp) throw new ApiError(404, 'Rejection follow-up not found')
  const project = projectById(state, candidate.projectId)
  const attempts = (candidate.contactLogs ?? []).filter(log => log.context === 'rejection_follow_up').sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt))
  return { ...candidate.rejectionFollowUp, candidateApplicationId: candidate.id, projectId: project.id, attemptCount: attempts.length, lastAttemptAt: attempts[0]?.attemptedAt ?? null,
    candidate: { id: candidate.id, candidateId: candidate.candidateId, name: candidate.name, stage: candidate.stage, status: candidate.status, email: candidate.email, phone: candidate.phone },
    project: { id: project.id, name: project.name, status: project.status } }
}
export function rejectionContact(candidate: StoredCandidate, user: DemoUser, input: { result: 'not_reached' | 'rejection_handled'; attemptedAt: Date; notes?: string }) {
  requireRole(user, 'human_resource')
  const followUp = candidate.rejectionFollowUp
  if (!followUp) throw new ApiError(404, 'Rejection follow-up not found')
  if (followUp.status === 'handled' || Date.parse(followUp.eligibleAt) > Date.now()) throw new ApiError(409, 'Rejection follow-up is not available')
  const handled = input.result === 'rejection_handled'
  const attemptedAt = input.attemptedAt.toISOString()
  contact(candidate, input.result, attemptedAt, input.notes, 'rejection_follow_up')
  followUp.status = handled ? 'handled' : 'not_reached'; followUp.handledAt = handled ? attemptedAt : null
  activity(candidate, user, handled ? 'Rejection Follow-Up Handled' : 'Rejection Contact Attempt Logged', input.notes ?? (handled ? 'Candidate was informed of the rejection.' : 'Candidate was not reached.'), attemptedAt)
}
