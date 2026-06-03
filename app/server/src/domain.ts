import { z } from 'zod'

export const CandidateStageSchema = z.enum([
  'pre_interview',
  'department_interview',
  'hr_interview',
  'manager_review',
  'offer_stage',
])

export const CandidateStatusSchema = z.enum([
  'waiting_for_contact',
  'scheduled',
  'not_reached',
  'withdrawn',
  'rejected',
  'assessment_sent',
  'waitlisted',
  'approved_for_offer',
  'final_check_sent',
  'offer_sent',
  'offer_rejected',
  'offer_accepted',
  'proceeded_with_another_candidate',
])

export const CandidateTransitionActionSchema = z.enum([
  'mark_contact_successful',
  'mark_not_reached',
  'withdraw',
  'move_to_department_interview',
  'move_to_hr_interview',
  'send_assessment',
  'move_to_candidate_review',
  'approve_for_offer',
  'waitlist',
  'send_final_check',
  'send_offer',
  'offer_accepted',
  'reject',
])

export const CandidateTransitionSchema = z.object({
  action: CandidateTransitionActionSchema,
})

export const ProjectStatusSchema = z.enum(['active', 'archived', 'closed'])

export const UserRoleSchema = z.enum(['admin', 'hr_manager', 'hiring_manager'])

export const ImportModeSchema = z.enum(['auto_sync', 'manual_import'])

const OptionalTextSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().optional(),
)

const ProjectAssignmentSchema = {
  hiringManagerUserIds: z.array(z.string().min(1)).min(1),
  assignedHrUserIds: z.array(z.string().min(1)).min(1),
}

export const ListProjectsQuerySchema = z.object({
  status: ProjectStatusSchema.optional(),
  query: z.string().optional(),
})

export const ListUsersQuerySchema = z.object({
  role: UserRoleSchema.optional(),
})

export const ListCandidatesQuerySchema = z.object({
  projectId: z.string().optional(),
  stage: CandidateStageSchema.optional(),
  status: CandidateStatusSchema.optional(),
  query: z.string().optional(),
})

export const CreateProjectSchema = z.object({
  name: z.string().trim().min(1),
  position: z.string().trim().min(1),
  ...ProjectAssignmentSchema,
  hiringManager: z.string().optional(),
  assignedHr: z.array(z.string()).optional(),
  linkedinProjectId: OptionalTextSchema,
  importMode: ImportModeSchema.default('auto_sync'),
  notes: OptionalTextSchema,
})

export const UpdateProjectSchema = CreateProjectSchema
