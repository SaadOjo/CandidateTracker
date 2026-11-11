import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { PrismaClient } from '@prisma/client'
import { createSimulatorIntegration } from '../../src/features/simulator-import/service.js'
import { TrackingMetadataSchema, type SimulatorProject } from '../../src/features/simulator-import/contract.js'
import { candidateResponseInclude, toCandidateResponse } from '../../src/features/candidates/response.js'

const databaseUrl = process.env.TEST_DATABASE_URL
if (!databaseUrl || !new URL(databaseUrl).pathname.includes('_test')) {
  throw new Error('TEST_DATABASE_URL must explicitly name an isolated _test database')
}

test('simulator project import persists only shortlisted candidates without resetting progress', async (t) => {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl })
  const prefix = `sim-test-${randomUUID()}`
  const projectIds: string[] = []
  const context = `urn:li:organization:${prefix}`
  const snapshot: SimulatorProject = {
    contract: 'candidate-tracker-simulator-project-v1', integrationContext: context,
    project: { id: `${prefix}-source`, name: 'Test project', position: 'Engineer', company: 'Example', location: 'Istanbul', owner: 'Test owner', referenceEntityType: 'REQUISITION', referenceEntityId: `${prefix}-req` },
    pipelineStages: ['uncontacted', 'contacted', 'replied', 'shortlisted'],
    candidates: ['shortlisted', 'uncontacted', 'contacted', 'replied'].map((stage, index) => ({
      id: `${prefix}-${index}`, firstName: `Person ${index}`, lastName: 'Test', headline: 'Engineer',
      currentEmployerNames: ['Example'], location: { countryCode: 'TR', locationName: 'Istanbul' },
      member: `urn:li:person:${prefix}-${index}`, profileUrl: `https://linkedin.invalid/${prefix}-${index}`,
      stage: stage as SimulatorProject['candidates'][number]['stage'],
    })),
  }
  let responseMode = 'valid'
  let redirectRequests = 0
  let secondSnapshot: SimulatorProject | null = null
  const requestedProjects: string[] = []
  const source = createServer((request, response) => {
    if (request.headers.authorization !== 'Bearer test-token') { response.writeHead(401).end(); return }
    if (responseMode === 'failure') { response.writeHead(503).end(); return }
    if (responseMode === 'unpublished') { response.writeHead(409).end(); return }
    if (responseMode === 'redirect') { redirectRequests += 1; response.writeHead(302, { Location: '/redirect-target' }).end(); return }
    response.setHeader('Content-Type', 'application/json')
    const url = new URL(request.url!, 'http://127.0.0.1')
    if (url.pathname === '/simulator/projects') {
      response.end(JSON.stringify({ projects: [snapshot, ...(secondSnapshot ? [secondSnapshot] : [])].map((source) => ({ id: source.project.id, name: source.project.name, exportedAt: Date.now() })) }))
      return
    }
    const requestedProject = url.searchParams.get('projectId') ?? ''
    requestedProjects.push(requestedProject)
    response.end(responseMode === 'invalid' ? '{' : JSON.stringify(secondSnapshot?.project.id === requestedProject ? secondSnapshot : snapshot))
  })
  source.listen(0, '127.0.0.1')
  await once(source, 'listening')
  const address = source.address()
  assert.ok(address && typeof address !== 'string')
  const service = createSimulatorIntegration(prisma, { url: `http://127.0.0.1:${address.port}`, token: 'test-token', intervalMs: 5000 })
  t.after(async () => {
    await new Promise<void>((resolve, reject) => source.close((error) => error ? reject(error) : resolve()))
    const candidates = await prisma.externalReference.findMany({ where: { provider: 'rsc_simulator', resourceType: 'candidate', externalId: { contains: prefix } }, select: { candidateId: true } })
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } })
    await prisma.candidate.deleteMany({ where: { id: { in: candidates.flatMap((ref) => ref.candidateId ? [ref.candidateId] : []) } } })
    await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } })
    await prisma.$disconnect()
  })
  const hr = await prisma.user.create({ data: { id: `${prefix}-hr`, oidcSubject: `${prefix}-hr`, email: `${prefix}-hr@example.test`, name: 'Test HR', role: 'human_resource' } })
  const manager = await prisma.user.create({ data: { id: `${prefix}-manager`, oidcSubject: `${prefix}-manager`, email: `${prefix}-manager@example.test`, name: 'Test manager', role: 'hiring_manager' } })
  const input = { sourceProjectId: snapshot.project.id, hiringManagerUserIds: [manager.id], assignedHumanResourceUserIds: [hr.id] }
  snapshot.candidates[0].email = 'original@example.com'
  snapshot.candidates[0].phone = '+1 202 555 0100'
  const projectId = await service.importProject(hr.id, input)
  assert.equal(requestedProjects.at(-1), input.sourceProjectId)
  projectIds.push(projectId)
  const list = () => prisma.candidateApplication.findMany({ where: { projectId }, orderBy: { createdAt: 'asc' } })
  const tracking = async () => TrackingMetadataSchema.parse((await prisma.externalReference.findFirstOrThrow({ where: { projectId, provider: 'rsc_simulator' } })).metadata)

  await t.test('only shortlisted candidates enter the first stage and project assignments persist', async () => {
    const applications = await list()
    assert.equal(applications.length, 1)
    assert.equal(applications[0].stage, 'pre_interview')
    assert.equal(applications[0].status, 'waiting_for_contact')
    const candidate = await prisma.candidate.findUniqueOrThrow({ where: { id: applications[0].candidateId } })
    assert.equal(candidate.email, 'original@example.com')
    assert.equal(candidate.phone, '+1 202 555 0100')
    assert.equal(await prisma.projectMember.count({ where: { projectId } }), 2)
    const metadata = await tracking()
    assert.equal(metadata.sourceCandidateCount, 4)
    assert.equal(metadata.matchingCandidateCount, 1)
    assert.equal(metadata.lastError, null)
    await assert.rejects(service.importProject(hr.id, input), /already imported/)
  })

  await t.test('concurrent sync imports a newly shortlisted candidate exactly once', async () => {
    const [original] = await list()
    await prisma.candidateApplication.update({ where: { id: original.id }, data: { stage: 'department_interview', status: 'waiting_for_contact' } })
    snapshot.candidates[1].stage = 'shortlisted'
    const results = await Promise.all([service.syncProject(projectId), service.syncProject(projectId)])
    assert.equal(results.reduce((sum, result) => sum + result.imported, 0), 1)
    assert.equal((await list()).length, 2)
    assert.equal((await prisma.candidateApplication.findUniqueOrThrow({ where: { id: original.id } })).stage, 'department_interview')
    assert.equal(await prisma.activityEvent.count({ where: { projectId, eventType: 'imported' } }), 2)
    snapshot.candidates[0].stage = 'replied'
    assert.deepEqual(await service.syncProject(projectId), { imported: 0 })
    assert.equal((await list()).length, 2)
  })

  await t.test('contacts backfill independently without resetting existing applications or overwriting owned values', async () => {
    const applications = await list()
    const [original, newer] = applications
    await prisma.candidate.update({ where: { id: original.candidateId }, data: { email: null, phone: 'local phone' } })
    await prisma.candidate.update({ where: { id: newer.candidateId }, data: { email: 'local@example.com', phone: '' } })
    // The original source profile has left the shortlist; its existing application still needs contacts.
    assert.equal(snapshot.candidates[0].stage, 'replied')
    snapshot.candidates[0].email = 'backfill@example.com'
    snapshot.candidates[0].phone = '+1 202 555 0109'
    snapshot.candidates[1].email = 'source@example.com'
    snapshot.candidates[1].phone = '+1 202 555 0101'
    const eventsBefore = await prisma.activityEvent.count({ where: { projectId } })
    assert.deepEqual(await Promise.all([service.syncProject(projectId), service.syncProject(projectId)]), [{ imported: 0 }, { imported: 0 }])
    assert.deepEqual(await list(), applications)
    assert.equal(await prisma.activityEvent.count({ where: { projectId } }), eventsBefore)
    const originalCandidate = await prisma.candidate.findUniqueOrThrow({ where: { id: original.candidateId } })
    assert.equal(originalCandidate.email, 'backfill@example.com')
    assert.equal(originalCandidate.phone, 'local phone')
    const detail = await prisma.candidateApplication.findUniqueOrThrow({ where: { id: newer.id }, include: candidateResponseInclude })
    const response = toCandidateResponse(detail, 'human_resource')
    assert.equal(response.email, 'local@example.com')
    assert.equal(response.phone, '+1 202 555 0101')
    delete snapshot.candidates[1].email
    delete snapshot.candidates[1].phone
    await service.syncProject(projectId)
    const preserved = await prisma.candidate.findUniqueOrThrow({ where: { id: newer.candidateId } })
    assert.equal(preserved.email, 'local@example.com')
    assert.equal(preserved.phone, '+1 202 555 0101')
  })

  await t.test('failed and malformed exports create no records and expose a recoverable error', async () => {
    for (const mode of ['failure', 'invalid', 'unpublished', 'redirect']) {
      responseMode = mode
      await assert.rejects(service.syncProject(projectId))
      assert.ok((await tracking()).lastError)
      if (mode === 'unpublished') assert.match((await tracking()).lastError!, /Press Export Project/)
      if (mode === 'redirect') assert.equal(redirectRequests, 1, 'redirect destination must never be fetched')
      assert.equal((await list()).length, 2)
    }
    responseMode = 'valid'
    const savedEmail = snapshot.candidates[0].email
    snapshot.candidates[0].email = 'invalid-email'
    await assert.rejects(service.syncProject(projectId), /invalid project export/)
    snapshot.candidates[0].email = savedEmail
    snapshot.candidates[2].member = snapshot.candidates[1].member
    await assert.rejects(service.syncProject(projectId), /invalid project export/)
    snapshot.candidates[2].member = `urn:li:person:${prefix}-2`
    snapshot.project.id += '-changed'
    await assert.rejects(service.syncProject(projectId), /identity does not match/)
    snapshot.project.id = input.sourceProjectId
    await service.syncProject(projectId)
    assert.equal((await tracking()).lastError, null)
  })

  await t.test('candidate identity is reused across distinct imported projects', async () => {
    secondSnapshot = structuredClone(snapshot)
    secondSnapshot.project.id = `${prefix}-second`
    const secondId = await service.importProject(hr.id, { ...input, sourceProjectId: secondSnapshot.project.id })
    projectIds.push(secondId)
    assert.equal(requestedProjects.at(-1), secondSnapshot.project.id)
    const second = await prisma.candidateApplication.findFirstOrThrow({ where: { projectId: secondId } })
    assert.ok((await list()).some((application) => application.candidateId === second.candidateId))
    assert.deepEqual((await service.listSourceProjects()).map((project) => project.id), [snapshot.project.id, secondSnapshot.project.id])
    snapshot.candidates[2].stage = 'shortlisted'
    const results = await Promise.all([service.syncProject(projectId), service.syncProject(secondId)])
    assert.deepEqual(results, [{ imported: 1 }, { imported: 0 }])
    assert.equal((await list()).length, 3)
    assert.equal(await prisma.candidateApplication.count({ where: { projectId: secondId } }), 1)
    assert.deepEqual(new Set(requestedProjects.slice(-2)), new Set([snapshot.project.id, secondSnapshot.project.id]))
  })

  await t.test('closed projects cannot receive new imports', async () => {
    await prisma.project.update({ where: { id: projectId }, data: { status: 'archived' } })
    snapshot.candidates[3].stage = 'shortlisted'
    await assert.rejects(service.syncProject(projectId), /Only active projects/)
    assert.equal((await list()).length, 3)
  })
})
