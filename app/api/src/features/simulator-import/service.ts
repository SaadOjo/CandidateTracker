import type { Prisma, PrismaClient } from '@prisma/client'
import { ApiError } from '../../errors.js'
import { createProjectService } from '../projects/service.js'
import { SimulatorCatalogSchema, SimulatorProjectSchema, sourceProjectKey, simulatorProvider, TrackingMetadataSchema } from './contract.js'
import type { SimulatorConfig, SimulatorProject } from './contract.js'

export function createSimulatorIntegration(prisma: PrismaClient, config: SimulatorConfig) {
  async function readSourceResponse(path: string): Promise<unknown> {
    let response: Response
    try {
      response = await fetch(`${config.url}${path}`, {
        headers: { Authorization: `Bearer ${config.token}` },
        signal: AbortSignal.timeout(4000), redirect: 'error',
      })
    } catch {
      throw new ApiError(502, 'Simulator is unreachable. Check that it is running.')
    }
    if (response.status === 409) throw new ApiError(502, 'Simulator has no exported project. Press Export Project in the simulator.')
    if (!response.ok) throw new ApiError(502, `Simulator returned HTTP ${response.status}`)
    let body: unknown
    try { body = await response.json() }
    catch { throw new ApiError(502, 'Simulator returned invalid JSON') }
    return body
  }

  async function readSource(sourceProjectId: string): Promise<SimulatorProject> {
    const body = await readSourceResponse(`/simulator/project-export?projectId=${encodeURIComponent(sourceProjectId)}`)
    const result = SimulatorProjectSchema.safeParse(body)
    if (!result.success) throw new ApiError(502, 'Simulator returned an invalid project export')
    return result.data
  }

  async function listSourceProjects() {
    const result = SimulatorCatalogSchema.safeParse(await readSourceResponse('/simulator/projects'))
    if (!result.success) throw new ApiError(502, 'Simulator returned an invalid project catalog')
    return result.data.projects
  }

  function metadata(snapshot: SimulatorProject, lastSyncedAt: string | null) {
    return {
      sourceProjectId: snapshot.project.id, integrationContext: snapshot.integrationContext,
      sourceStage: 'shortlisted' as const, lastSyncedAt, lastError: null,
      sourceCandidateCount: snapshot.candidates.length,
      matchingCandidateCount: snapshot.candidates.filter((person) => person.stage === 'shortlisted').length,
    }
  }

  async function importCandidates(tx: Prisma.TransactionClient, projectId: string, snapshot: SimulatorProject) {
    let imported = 0
    for (const profile of snapshot.candidates) {
      const externalId = JSON.stringify([snapshot.integrationContext, profile.member])
      const identity = { provider: simulatorProvider, resourceType: 'candidate' as const, externalId }
      const existingReference = await tx.externalReference.findUnique({ where: { provider_resourceType_externalId: identity } })
      let candidateId = existingReference?.candidateId
      if (existingReference && !candidateId) throw new ApiError(409, 'Simulator candidate reference has no candidate')
      if (!candidateId && profile.stage !== 'shortlisted') continue
      if (!candidateId) {
        const candidate = await tx.candidate.create({ data: {
          fullName: `${profile.firstName} ${profile.lastName}`, source: 'linkedin',
          linkedinProfileUrl: profile.profileUrl, lastSyncedAt: new Date(),
          email: profile.email, phone: profile.phone,
          externalReferences: { create: { ...identity, metadata: profile } },
        } })
        candidateId = candidate.id
      } else {
        // Conditional updates preserve contacts entered locally, including concurrent edits.
        if (profile.email !== undefined) {
          await tx.candidate.updateMany({
            where: { id: candidateId, OR: [{ email: null }, { email: '' }] },
            data: { email: profile.email },
          })
        }
        if (profile.phone !== undefined) {
          await tx.candidate.updateMany({
            where: { id: candidateId, OR: [{ phone: null }, { phone: '' }] },
            data: { phone: profile.phone },
          })
        }
      }
      if (profile.stage !== 'shortlisted') continue
      const existingApplication = await tx.candidateApplication.findUnique({
        where: { projectId_candidateId: { projectId, candidateId } }, select: { id: true },
      })
      if (existingApplication) continue
      await tx.candidateApplication.create({ data: {
        candidateId, projectId, stage: 'pre_interview', status: 'waiting_for_contact',
        externalReferences: { create: {
          provider: simulatorProvider, resourceType: 'candidate_application',
          externalId: JSON.stringify([snapshot.integrationContext, snapshot.project.id, profile.member]),
          metadata: { sourceStage: profile.stage },
        } },
        activityEvents: { create: {
          projectId, eventType: 'imported', title: 'Candidate Imported',
          subtitle: 'RSC simulator: shortlisted', sourceType: 'rsc_simulator', sourceId: profile.member,
        } },
      } })
      imported += 1
    }
    return imported
  }

  async function lockSource(tx: Prisma.TransactionClient, context: string) {
    // Serialize shared candidate identity creation across tracked projects.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${simulatorProvider}:${context}`}, 0))::text`
  }

  async function importProject(actorUserId: string, input: {
    sourceProjectId: string; hiringManagerUserIds: string[]; assignedHumanResourceUserIds: string[];
  }) {
    const snapshot = await readSource(input.sourceProjectId)
    if (snapshot.project.id !== input.sourceProjectId) throw new ApiError(409, 'Simulator project changed. Reload before importing.')
    const assignment = await createProjectService(prisma).validateProjectAssignment(input.hiringManagerUserIds, input.assignedHumanResourceUserIds)
    return prisma.$transaction(async (tx) => {
      await lockSource(tx, snapshot.integrationContext)
      const key = { provider: simulatorProvider, resourceType: 'project' as const, externalId: sourceProjectKey(snapshot) }
      if (await tx.externalReference.findUnique({ where: { provider_resourceType_externalId: key } })) {
        throw new ApiError(409, 'This simulator project is already imported')
      }
      const project = await tx.project.create({ data: {
        name: snapshot.project.name, position: snapshot.project.position, createdByUserId: actorUserId,
        members: { create: [
          ...assignment.hiringManagerUserIds.map((userId) => ({ userId, projectRole: 'hiring_manager' as const })),
          ...assignment.assignedHumanResourceUserIds.map((userId) => ({ userId, projectRole: 'human_resource' as const })),
        ] },
        externalReferences: { create: { ...key, metadata: metadata(snapshot, new Date().toISOString()) } },
      } })
      await importCandidates(tx, project.id, snapshot)
      return project.id
    }, { timeout: 15000 })
  }

  async function syncProject(projectId: string) {
    const reference = await prisma.externalReference.findFirst({ where: { projectId, provider: simulatorProvider, resourceType: 'project' } })
    if (!reference) throw new ApiError(404, 'Project is not linked to the simulator')
    const tracking = TrackingMetadataSchema.parse(reference.metadata)
    try {
      const snapshot = await readSource(tracking.sourceProjectId)
      if (sourceProjectKey(snapshot) !== reference.externalId) throw new ApiError(409, 'Simulator project identity does not match the tracked project')
      return await prisma.$transaction(async (tx) => {
        await lockSource(tx, snapshot.integrationContext)
        await tx.$queryRaw`SELECT id FROM projects WHERE id = ${projectId} FOR UPDATE`
        const project = await tx.project.findUniqueOrThrow({ where: { id: projectId } })
        if (project.status !== 'active' || project.hiredApplicationId) throw new ApiError(409, 'Only active projects without a hire can import candidates')
        const imported = await importCandidates(tx, projectId, snapshot)
        await tx.externalReference.update({ where: { id: reference.id }, data: { metadata: metadata(snapshot, new Date().toISOString()) } })
        return { imported }
      }, { timeout: 15000 })
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Simulator sync failed'
      // Preserve counters and timestamps committed by any concurrent successful sync.
      await prisma.$executeRaw`UPDATE external_references
        SET metadata_json = jsonb_set(metadata_json, '{lastError}', to_jsonb(${message}::text)), updated_at = NOW()
        WHERE id = ${reference.id}`
      throw error
    }
  }

  async function syncTrackedProjects() {
    const references = await prisma.externalReference.findMany({
      where: { provider: simulatorProvider, resourceType: 'project', project: { status: 'active', hiredApplicationId: null } },
    })
    // Each project reports its own failure without stopping other tracked projects.
    const results = []
    for (const reference of references) {
      if (reference.projectId) results.push(await syncProject(reference.projectId).then(() => null, (error: unknown) => error))
    }
    return results.filter((error) => error !== null)
  }

  return { readSource, listSourceProjects, importProject, syncProject, syncTrackedProjects }
}

export type SimulatorIntegration = ReturnType<typeof createSimulatorIntegration>
