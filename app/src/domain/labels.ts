import type { CandidateStatus, PipelineStage, ProjectStatus } from './types'

export const stageLabels: Record<PipelineStage, string> = {
  department_interview: '1. Department Interview',
  hr_interview: '2. HR Interview',
  manager_review: '3. Manager Review',
  offer_stage: '4. Offer Stage',
}

export const stageOrder: PipelineStage[] = [
  'department_interview',
  'hr_interview',
  'manager_review',
  'offer_stage',
]

export const statusLabels: Record<CandidateStatus, string> = {
  waiting_for_contact: 'Waiting for Contact',
  scheduled: 'Scheduled',
  not_reached: 'Not Reached',
  withdrawn: 'Withdrawn',
  rejected: 'Rejected',
  waitlisted: 'Waitlisted',
  approved_for_offer: 'Approved for Offer',
  offer_sent: 'Offer Sent',
  offer_rejected: 'Offer Rejected',
  offer_accepted: 'Offer Accepted',
}

export const projectStatusLabels: Record<ProjectStatus, string> = {
  active: 'ACTIVE',
  archived: 'ARCHIVED',
}
