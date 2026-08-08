import type { CandidateStatus, PipelineStage, ProjectStatus, SessionAppRole, UserRole } from './types'

export const appRoleLabels: Record<SessionAppRole, string> = {
  admin: 'Admin',
  human_resource: 'Human Resource',
  hiring_manager: 'Hiring Manager',
}

export const projectStatusLabels: Record<ProjectStatus | 'candidate_accepted', string> = {
  active: 'ACTIVE',
  archived: 'ARCHIVED',
  closed: 'CLOSED',
  candidate_accepted: 'CANDIDATE ACCEPTED',
}

export const userRoleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  human_resource: 'Human Resource',
  hiring_manager: 'Hiring Manager',
}

export const stageOrder: PipelineStage[] = [
  'pre_interview',
  'department_interview',
  'hr_interview',
  'manager_review',
  'offer_stage',
]

export const stageLabels: Record<PipelineStage, string> = {
  pre_interview: '1. Pre-Interview',
  department_interview: '2. Department Interview',
  hr_interview: '3. HR Interview',
  manager_review: '4. Candidate Review',
  offer_stage: '5. Offer Stage',
}

export const statusLabels: Record<CandidateStatus, string> = {
  waiting_for_contact: 'Waiting for Contact',
  scheduled: 'Scheduled',
  not_reached: 'Not Reached',
  withdrawn: 'Withdrawn',
  rejected: 'Rejected',
  assessment_sent: 'Assessment Sent',
  waitlisted: 'Waitlisted',
  approved_for_offer: 'Approved for Offer',
  final_check_sent: 'Final Check Sent',
  offer_sent: 'Offer Sent',
  offer_rejected: 'Offer Rejected',
  offer_accepted: 'Offer Accepted',
  proceeded_with_another_candidate: 'Proceeded with Another Candidate',
}
