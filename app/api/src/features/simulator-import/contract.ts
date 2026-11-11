import { z } from 'zod'

export const SimulatorStageSchema = z.enum(['uncontacted', 'contacted', 'replied', 'shortlisted'])
const ProfileSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  headline: z.string(),
  currentEmployerNames: z.array(z.string()),
  location: z.object({ locationName: z.string(), countryCode: z.string() }),
  member: z.string().startsWith('urn:li:person:'),
  profileUrl: z.url(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(1).optional(),
  stage: SimulatorStageSchema,
})

export const SimulatorProjectSchema = z.object({
  contract: z.literal('candidate-tracker-simulator-project-v1'),
  integrationContext: z.string().startsWith('urn:li:organization:'),
  project: z.object({
    id: z.string().min(1), name: z.string().trim().min(1), position: z.string().trim().min(1),
    company: z.string(), location: z.string(), owner: z.string(),
    referenceEntityType: z.literal('REQUISITION'), referenceEntityId: z.string().min(1),
  }),
  pipelineStages: z.array(SimulatorStageSchema),
  candidates: z.array(ProfileSchema).max(1000),
}).superRefine((value, context) => {
  for (const field of ['id', 'member'] as const) {
    if (new Set(value.candidates.map((person) => person[field])).size !== value.candidates.length) {
      context.addIssue({ code: 'custom', message: `Duplicate candidate ${field}`, path: ['candidates'] })
    }
  }
})

export type SimulatorProject = z.infer<typeof SimulatorProjectSchema>
export const SimulatorCatalogSchema = z.object({
  projects: z.array(z.object({ id: z.string().min(1), name: z.string().min(1), exportedAt: z.number().nullable() })),
}).superRefine(({ projects }, context) => {
  if (new Set(projects.map((project) => project.id)).size !== projects.length) {
    context.addIssue({ code: 'custom', message: 'Duplicate project identifier', path: ['projects'] })
  }
})
export interface SimulatorConfig { url: string; token: string; intervalMs: number }
export const simulatorProvider = 'rsc_simulator'
export const sourceProjectKey = (snapshot: SimulatorProject) => JSON.stringify([snapshot.integrationContext, snapshot.project.id])

export const TrackingMetadataSchema = z.object({
  sourceProjectId: z.string(), integrationContext: z.string(),
  sourceStage: z.literal('shortlisted'),
  lastSyncedAt: z.string().nullable(), lastError: z.string().nullable(),
  sourceCandidateCount: z.number().int(), matchingCandidateCount: z.number().int(),
})
