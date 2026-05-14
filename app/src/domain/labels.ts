import type { CandidateStatus, PipelineStage, ProjectStatus } from './types'

export const stageLabels: Record<PipelineStage, string> = {
  pre_interview: '1. Pre-Interview',
  department_interview: '2. Department Interview',
  hr_interview: '3. HR Interview',
  manager_review: '4. Candidate Review',
  offer_stage: '5. Offer Stage',
}

export const stageOrder: PipelineStage[] = [
  'pre_interview',
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
  assessment_sent: 'Assessment Sent',
  waiting_for_assessment: 'Waiting for Assessment',
  waitlisted: 'Waitlisted',
  approved_for_offer: 'Approved for Offer',
  offer_sent: 'Offer Sent',
  offer_rejected: 'Offer Rejected',
  offer_accepted: 'Offer Accepted',
  proceeded_with_another_candidate: 'Proceeded with Another Candidate',
}

export const projectStatusLabels: Record<ProjectStatus, string> = {
  active: 'ACTIVE',
  archived: 'ARCHIVED',
}
