import type { AppRole, SessionAppRole } from './types'

export function requireCandidateWorkflowRole(appRole: SessionAppRole): AppRole {
  if (appRole === 'human_resource') return 'human_resource'
  if (appRole === 'hiring_manager') return 'hiring_manager'
  throw new Error(`Candidate workflow does not support application role: ${appRole}`)
}
