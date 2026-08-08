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

const OptionalTextSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().optional(),
)

export const CandidateTransitionActionSchema = z.enum([
  'mark_contact_successful',
  'mark_not_reached',
  'withdraw',
  'move_to_department_interview',
  'schedule_department_interview',
  'move_to_hr_interview',
  'schedule_hr_interview',
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
  notes: OptionalTextSchema,
  occurredAt: z.coerce.date().optional(),
  interviewStartAt: z.coerce.date().optional(),
  meetingUrl: OptionalTextSchema,
})

export const UpsertCandidateNoteSchema = z.object({
  body: OptionalTextSchema,
  fields: z.array(z.object({
    question: z.string().trim().min(1),
    answer: z.string().trim().min(1),
    visibility: z.enum(['all', 'human_resource_only']).default('all'),
  })).optional(),
  visibility: z.enum(['all', 'human_resource_only']).default('all'),
}).refine(
  (value) => Boolean(value.body) || Boolean(value.fields?.length),
  { message: 'Note body or fields are required.' },
)

export const UpdateProjectStageCommentSchema = z.object({
  body: z.string().trim(),
})

export const ProjectStatusSchema = z.enum(['active', 'archived', 'closed'])

export const UserRoleSchema = z.enum(['admin', 'human_resource', 'hiring_manager'])

export const ImportModeSchema = z.enum(['auto_sync', 'manual_import'])

const ProjectAssignmentSchema = {
  hiringManagerUserIds: z.array(z.string().min(1)).min(1),
  assignedHumanResourceUserIds: z.array(z.string().min(1)).min(1),
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

export const RejectionFollowUpStatusSchema = z.enum(['waiting_for_contact', 'not_reached', 'handled'])

export const ListRejectionFollowUpsQuerySchema = z.object({
  projectId: z.string().optional(),
  status: RejectionFollowUpStatusSchema.optional(),
  query: z.string().optional(),
})

export const LogRejectionContactAttemptSchema = z.object({
  result: z.enum(['not_reached', 'rejection_handled']),
  attemptedAt: z.coerce.date(),
  notes: OptionalTextSchema,
})

export const CreateProjectSchema = z.object({
  name: z.string().trim().min(1),
  position: z.string().trim().min(1),
  ...ProjectAssignmentSchema,
  hiringManager: z.string().optional(),
  assignedHumanResources: z.array(z.string()).optional(),
  linkedinProjectId: OptionalTextSchema,
  importMode: ImportModeSchema.default('auto_sync'),
  notes: OptionalTextSchema,
})

export const UpdateProjectSchema = CreateProjectSchema
