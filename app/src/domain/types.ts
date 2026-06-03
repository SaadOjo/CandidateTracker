export type AppRole = 'hr' | 'hm'

export type SessionAppRole = 'admin' | AppRole

export type UserRole = 'admin' | 'hr_manager' | 'hiring_manager'

export type ProjectStatus = 'active' | 'archived' | 'closed'

export type ImportMode = 'auto_sync' | 'manual_import'

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
  | 'move_to_hr_interview'
  | 'send_assessment'
  | 'move_to_candidate_review'
  | 'approve_for_offer'
  | 'waitlist'
  | 'send_final_check'
  | 'send_offer'
  | 'offer_accepted'
  | 'reject'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  active: boolean
}

export interface AuthSession {
  userId: string
  email: string
  name: string
  role: UserRole
  appRole: SessionAppRole
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
  assignedHr: string[]
  assignedHrUserIds: string[]
  linkedinProjectId?: string
  importMode: ImportMode
  notes?: string
  createdAt: string
  archivedAt?: string | null
  stageComments?: ProjectStageComment[]
}

export interface ProjectFormInput {
  name: string
  position: string
  notes?: string
  hiringManagerUserIds: string[]
  assignedHrUserIds: string[]
  linkedinProjectId?: string
  importMode: ImportMode
}

export interface ProjectStageComment {
  id: string
  stage: PipelineStage
  authorRole: 'hr' | 'hiring_manager'
  body: string
  createdAt: string
  author?: Pick<User, 'id' | 'name' | 'role'>
}

export interface NoteField {
  question: string
  answer: string
  visibility?: 'all' | 'hr_only'
}

export interface CandidateNote {
  id: string
  authorRole?: 'hr' | 'hiring_manager'
  author?: Pick<User, 'id' | 'name' | 'role'>
  body?: string | null
  fields?: NoteField[] | null
  visibility?: 'all' | 'hr_only'
  createdAt: string
}

export interface CandidateActivityEvent {
  id: string
  title: string
  subtitle?: string | null
  occurredAt?: string
  createdAt?: string
  actorRole?: UserRole | null
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

export interface Candidate {
  id: string
  candidateId: string
  projectId: string
  name: string
  source: string
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
}

export interface CandidateFilters {
  projectId?: string
  stage?: PipelineStage
  status?: CandidateStatus
  query?: string
}
