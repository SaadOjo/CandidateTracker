import type { CandidateStage, CandidateStatus, Role } from '@prisma/client'
import type { z } from 'zod'
import type { CandidateTransitionActionSchema } from '../../domain.js'
import { ApiError } from '../../errors.js'

type Action = z.infer<typeof CandidateTransitionActionSchema>
type State = { stage: CandidateStage; status: CandidateStatus }
type Rule = {
  roles: Role[]
  stages: CandidateStage[]
  statuses?: CandidateStatus[]
}

const outreachStages: CandidateStage[] = ['pre_interview', 'department_interview', 'hr_interview']
const terminalStatuses: CandidateStatus[] = ['rejected', 'withdrawn', 'offer_rejected', 'offer_accepted', 'proceeded_with_another_candidate']

const rules: Record<Exclude<Action, 'reject'>, Rule> = {
  mark_contact_successful: { roles: ['human_resource'], stages: ['pre_interview'] },
  mark_not_reached: { roles: ['human_resource'], stages: outreachStages },
  withdraw: { roles: ['human_resource'], stages: outreachStages },
  move_to_department_interview: { roles: ['human_resource', 'hiring_manager'], stages: ['pre_interview'], statuses: ['scheduled'] },
  schedule_department_interview: { roles: ['human_resource'], stages: ['department_interview'] },
  move_to_hr_interview: { roles: ['hiring_manager'], stages: ['department_interview'], statuses: ['scheduled'] },
  schedule_hr_interview: { roles: ['human_resource'], stages: ['hr_interview'] },
  send_assessment: { roles: ['human_resource'], stages: ['hr_interview'], statuses: ['waiting_for_contact', 'not_reached', 'scheduled'] },
  move_to_candidate_review: { roles: ['human_resource'], stages: ['hr_interview'], statuses: ['assessment_sent'] },
  approve_for_offer: { roles: ['human_resource', 'hiring_manager'], stages: ['manager_review'] },
  waitlist: { roles: ['human_resource', 'hiring_manager'], stages: ['manager_review'] },
  send_final_check: { roles: ['human_resource'], stages: ['offer_stage'], statuses: ['approved_for_offer'] },
  send_offer: { roles: ['human_resource'], stages: ['offer_stage'], statuses: ['final_check_sent'] },
  offer_accepted: { roles: ['human_resource'], stages: ['offer_stage'], statuses: ['offer_sent'] },
}

export function assertTransitionAllowed(state: State, action: Action, role: Role) {
  if (terminalStatuses.includes(state.status)) throw new ApiError(409, 'Candidate is no longer active in the workflow')
  const rule: Rule = action === 'reject' ? rejectionRule(state.stage) : rules[action]
  if (role !== 'admin' && !rule.roles.includes(role)) throw new ApiError(403, 'Your role cannot perform this action')
  if (!rule.stages.includes(state.stage) || (rule.statuses && !rule.statuses.includes(state.status))) {
    throw new ApiError(409, 'This action is not available in the current candidate stage and status')
  }
}

function rejectionRule(stage: CandidateStage): Rule {
  switch (stage) {
    case 'pre_interview': return { roles: ['human_resource', 'hiring_manager'], stages: [stage], statuses: ['scheduled'] }
    case 'department_interview': return { roles: ['hiring_manager'], stages: [stage], statuses: ['scheduled'] }
    case 'hr_interview': return { roles: ['human_resource'], stages: [stage] }
    case 'manager_review': return { roles: ['human_resource', 'hiring_manager'], stages: [stage] }
    case 'offer_stage': return { roles: ['human_resource'], stages: [stage] }
  }
}
