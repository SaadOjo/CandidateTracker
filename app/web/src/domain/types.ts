export type AppRole = 'human_resource' | 'hiring_manager'

export type SessionAppRole = 'admin' | AppRole

export type UserRole = 'admin' | 'human_resource' | 'hiring_manager'

export type ProjectStatus = 'active' | 'archived' | 'closed'

export type ImportMode = 'auto_sync' | 'manual_import'

export type CandidateSource = 'linkedin' | 'referral' | 'manual'

export type PipelineStage =
  | 'pre_interview'
  | 'department_interview'
  | 'hr_interview'
  | 'manager_review'
  | 'offer_stage'

export type CandidateStatus =
  | 'waiting_for_contact'
  | 'scheduled'
  | 'not_reached'
  | 'withdrawn'
  | 'rejected'
  | 'assessment_sent'
  | 'waitlisted'
  | 'approved_for_offer'
  | 'final_check_sent'
  | 'offer_sent'
  | 'offer_rejected'
  | 'offer_accepted'
  | 'proceeded_with_another_candidate'

export type CandidateTransitionAction =
  | 'mark_contact_successful'
  | 'mark_not_reached'
  | 'withdraw'
  | 'move_to_department_interview'
  | 'schedule_department_interview'
  | 'move_to_hr_interview'
  | 'schedule_hr_interview'
  | 'send_assessment'
  | 'move_to_candidate_review'
  | 'approve_for_offer'
  | 'waitlist'
  | 'send_final_check'
  | 'send_offer'
  | 'offer_accepted'
  | 'reject'

export interface CandidateTransitionInput {
  action: CandidateTransitionAction
  notes?: string
  occurredAt?: string
  interviewStartAt?: string
  meetingUrl?: string
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  active: boolean
}

export interface Project {
  id: string
  name: string
  position: string
  status: ProjectStatus
  candidateCount: number
  hasAcceptedOffer: boolean
  hiringManager: string
  hiringManagerUserIds: string[]
  assignedHumanResources: string[]
  assignedHumanResourceUserIds: string[]
  linkedinProjectId?: string
  importMode: ImportMode
  notes?: string
  createdAt: string
  archivedAt?: string | null
  stageComments?: ProjectStageComment[]
  simulatorTracking?: {
    sourceProjectId: string
    integrationContext: string
    sourceStage: 'shortlisted'
    lastSyncedAt: string | null
    lastError: string | null
    sourceCandidateCount: number
    matchingCandidateCount: number
  } | null
}

export interface ProjectFormInput {
  name: string
  position: string
  notes?: string
  hiringManagerUserIds: string[]
  assignedHumanResourceUserIds: string[]
  linkedinProjectId?: string
  importMode: ImportMode
}

export interface ProjectStageComment {
  id: string
  stage: PipelineStage
  authorRole: 'human_resource' | 'hiring_manager'
  body: string
  createdAt: string
  author?: Pick<User, 'id' | 'name' | 'role'>
}

export interface NoteField {
  question: string
  answer: string
  visibility: 'all' | 'human_resource_only'
}

export interface CandidateNote {
  id: string
  authorRole: 'human_resource' | 'hiring_manager'
  author: Pick<User, 'id' | 'name' | 'role'>
  body?: string | null
  fields?: NoteField[] | null
  visibility: 'all' | 'human_resource_only'
  createdAt: string
  updatedAt: string
}

export interface CandidateNoteInput {
  body?: string
  fields?: NoteField[]
  visibility: 'all' | 'human_resource_only'
}

export interface CandidateActivityEvent {
  id: string
  index?: number
  title: string
  subtitle?: string | null
  occurredAt: string
  createdAt?: string
  actorRole?: UserRole | null
  actor?: Pick<User, 'id' | 'name' | 'role'> | null
}

export interface CandidateInterview {
  title: string
  date: string
  time: string
  timezone: string
  meetingUrl?: string | null
}

export interface ContactLog {
  id: string
  context: string
  result: string
  attemptedAt: string
  notes?: string | null
}

export type RejectionFollowUpStatus = 'waiting_for_contact' | 'not_reached' | 'handled'

export type RejectionFollowUpReason = 'rejected' | 'proceeded_with_another_candidate'

export interface RejectionFollowUpSummary {
  id: string
  status: RejectionFollowUpStatus
  reason: RejectionFollowUpReason
  eligibleAt: string
  handledAt?: string | null
}

export interface RejectionFollowUp extends RejectionFollowUpSummary {
  candidateApplicationId: string
  projectId: string
  attemptCount: number
  lastAttemptAt?: string | null
  candidate: {
    id: string
    candidateId: string
    name: string
    stage: PipelineStage
    status: CandidateStatus
    email?: string | null
    phone?: string | null
  }
  project: {
    id: string
    name: string
    status: ProjectStatus
  }
}

export interface RejectionContactAttemptInput {
  result: 'not_reached' | 'rejection_handled'
  attemptedAt: string
  notes?: string
}

export interface Candidate {
  id: string
  candidateId: string
  projectId: string
  name: string
  source: CandidateSource
  linkedinProfileUrl?: string | null
  email?: string | null
  phone?: string | null
  stage: PipelineStage
  status: CandidateStatus
  appliedAgo?: string | null
  contactAttempts: number
  interview?: CandidateInterview | null
  notes: CandidateNote[]
  activity: CandidateActivityEvent[]
  contactLogs?: ContactLog[]
  rejectionFollowUp?: RejectionFollowUpSummary | null
}

export interface CandidateFilters {
  projectId?: string
  stage?: PipelineStage
  status?: CandidateStatus
  query?: string
}
