export type Role = 'hr' | 'hm'

export type PipelineStage =
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
  | 'waitlisted'
  | 'approved_for_offer'
  | 'offer_sent'
  | 'offer_rejected'
  | 'offer_accepted'

export type ProjectStatus = 'active' | 'archived'

export interface Project {
  id: string
  name: string
  position: string
  status: ProjectStatus
  candidateCount: number
  hiringManager: string
  assignedHr: string[]
  linkedinProjectId?: string
  notes?: string
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
  tone?: 'success' | 'warning' | 'danger' | 'neutral'
}

export interface Note {
  id: string
  author: string
  createdAt: string
  body: string
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
