export type Role = 'hr' | 'hm'

export type PipelineStage =
  | 'pre_interview'
  | 'department_interview'
  | 'manager_review'
  | 'hr_interview'
  | 'offer_stage'

export type CandidateStatus =
  | 'waiting_for_contact'
  | 'scheduled'
  | 'not_reached'
  | 'withdrawn'
  | 'rejected'
  | 'assessment_sent'
  | 'waiting_for_assessment'
  | 'waitlisted'
  | 'approved_for_offer'
  | 'offer_sent'
  | 'offer_rejected'
  | 'offer_accepted'
  | 'proceeded_with_another_candidate'

export type ProjectStatus = 'active' | 'archived'

export interface Project {
  id: string
  name: string
  position: string
  status: ProjectStatus
  candidateCount: number
  hiringManager: string
  assignedHr: string[]
  createdAt?: string
  archivedAt?: string
  linkedinProjectId?: string
  notes?: string
  preInterviewComments?: {
    hr: string[]
    hm: string[]
  }
}

export interface InterviewDetails {
  title: string
  date: string
  time: string
  timezone: string
  meetingUrl?: string
}

export interface ActivityItem {
  id: string
  index: string
  title: string
  subtitle?: string
  date?: string
  tone?: 'success' | 'warning' | 'danger' | 'neutral' | 'stage'
}

export interface Note {
  id: string
  author: string
  authorName?: string
  createdAt: string
  body?: string
  visibility?: 'all' | 'hr_only'
  fields?: Array<{
    question: string
    answer: string
    visibility?: 'all' | 'hr_only'
  }>
}

export interface Candidate {
  id: string
  projectId: string
  name: string
  source: 'LinkedIn' | 'Referral' | 'Manual'
  resumeUrl?: string
  stage: PipelineStage
  status: CandidateStatus
  appliedAgo: string
  contactAttempts: number
  interview?: InterviewDetails
  activity: ActivityItem[]
  notes: Note[]
}

export interface CandidateFilters {
  projectId?: string
  stage?: PipelineStage
  status?: CandidateStatus
  query?: string
}
