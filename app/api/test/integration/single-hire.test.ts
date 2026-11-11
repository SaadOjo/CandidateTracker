import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../../src/app.js'
import { createAuthService } from '../../src/auth.js'

const databaseUrl = process.env.TEST_DATABASE_URL
if (!databaseUrl || !new URL(databaseUrl).pathname.includes('_test')) {
  throw new Error('TEST_DATABASE_URL must explicitly name an isolated _test database')
}

test('one hire per project', async (t) => {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl })
  const prefix = `single-hire-${randomUUID()}`
  const password = randomUUID()
  const app = await buildApp({
    prisma, authService: createAuthService(prisma, password), logger: false,
    config: { databaseUrl, host: '127.0.0.1', port: 4000, origins: ['http://localhost:5174'], developmentPassword: password },
  })
  t.after(async () => {
    await app.close()
    await prisma.project.deleteMany({ where: { id: { startsWith: prefix } } })
    await prisma.candidate.deleteMany({ where: { id: { startsWith: prefix } } })
    await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } })
    await prisma.$disconnect()
  })

  const hr = await prisma.user.create({ data: {
    id: `${prefix}-hr`, oidcSubject: `${prefix}-hr`, email: `${prefix}@example.test`,
    name: 'Test Human Resource', role: 'human_resource',
  } })
  const login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: hr.email, password } })
  assert.equal(login.statusCode, 200, login.body)
  const cookies = { candidate_tracker_session: login.cookies[0].value }
  const accept = (id: string) => app.inject({
    method: 'POST', url: `/candidates/${id}/transition`, cookies, payload: { action: 'offer_accepted' },
  })

  async function createProject() {
    const project = await prisma.project.create({ data: {
      id: `${prefix}-${randomUUID()}`, name: 'Single hire test', position: 'Engineer', createdByUserId: hr.id,
    } })
    const applications = []
    for (const [index, name] of ['Sam Taylor', 'Chris Brown'].entries()) {
      const candidate = await prisma.candidate.create({ data: {
        id: `${prefix}-${randomUUID()}`, fullName: name, source: 'manual',
      } })
      // Application statuses can be stale independently of offer/queue records.
      const application = await prisma.candidateApplication.create({ data: {
        projectId: project.id, candidateId: candidate.id, stage: 'offer_stage', status: 'offer_sent',
      } })
      await prisma.projectOfferQueueItem.create({ data: {
        projectId: project.id, candidateApplicationId: application.id, rank: index + 1, status: 'waiting',
      } })
      applications.push(application)
    }
    return { project, applications }
  }

  async function assertOneHire(projectId: string, winnerId: string, loserId: string) {
    const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } })
    assert.equal(project.hiredApplicationId, winnerId)
    assert.equal(project.status, 'closed')
    assert.ok(project.closedAt)
    assert.equal(await prisma.candidateApplication.count({ where: { projectId, status: 'offer_accepted' } }), 1)
    assert.equal(await prisma.offer.count({ where: { projectId, status: 'offer_accepted' } }), 1)
    assert.equal(await prisma.projectOfferQueueItem.count({ where: { projectId, status: 'accepted' } }), 1)
    assert.equal(await prisma.activityEvent.count({ where: { projectId, eventType: 'offer_accepted' } }), 1)
    assert.equal((await prisma.candidateApplication.findUniqueOrThrow({ where: { id: loserId } })).status, 'offer_sent')
    assert.equal(await prisma.offer.count({ where: { candidateApplicationId: loserId } }), 0)
    assert.equal((await prisma.projectOfferQueueItem.findUniqueOrThrow({ where: { candidateApplicationId: loserId } })).status, 'waiting')
    assert.equal(await prisma.activityEvent.count({ where: { candidateApplicationId: loserId } }), 0)
  }

  await t.test('a second acceptance cannot replace the hire or change the other candidate', async () => {
    const { project, applications: [first, second] } = await createProject()
    const accepted = await accept(first.id)
    assert.equal(accepted.statusCode, 200, accepted.body)
    const before = await prisma.project.findUniqueOrThrow({ where: { id: project.id } })
    const denied = await accept(second.id)
    assert.equal(denied.statusCode, 409, denied.body)
    assert.match(denied.body, /already has a hire/)
    assert.deepEqual(await prisma.project.findUniqueOrThrow({ where: { id: project.id } }), before)
    await assertOneHire(project.id, first.id, second.id)
  })

  await t.test('simultaneous acceptances produce exactly one hire', async () => {
    const { project, applications } = await createProject()
    const responses = await Promise.all(applications.map((application) => accept(application.id)))
    assert.deepEqual(responses.map((response) => response.statusCode).sort(), [200, 409])
    const winner = responses.findIndex((response) => response.statusCode === 200)
    await assertOneHire(project.id, applications[winner].id, applications[1 - winner].id)
  })

  await t.test('different projects can each hire independently', async () => {
    const first = await createProject()
    const second = await createProject()
    for (const fixture of [first, second]) {
      const response = await accept(fixture.applications[0].id)
      assert.equal(response.statusCode, 200, response.body)
      await assertOneHire(fixture.project.id, fixture.applications[0].id, fixture.applications[1].id)
    }
  })

  await t.test('each existing hire record blocks acceptance even when legacy records disagree', async () => {
    for (const source of ['project', 'application', 'offer']) {
      const { project, applications: [first, second] } = await createProject()
      if (source === 'project') {
        await prisma.project.update({ where: { id: project.id }, data: { hiredApplicationId: first.id } })
      } else if (source === 'application') {
        await prisma.candidateApplication.update({ where: { id: first.id }, data: { status: 'offer_accepted' } })
      } else {
        await prisma.offer.create({ data: {
          projectId: project.id, candidateApplicationId: first.id, status: 'offer_accepted', createdByUserId: hr.id,
        } })
      }
      const response = await accept(second.id)
      assert.equal(response.statusCode, 409, `${source}: ${response.body}`)
      assert.match(response.body, /already has a hire/)
      assert.equal(await prisma.activityEvent.count({ where: { projectId: project.id } }), 0)
      assert.equal((await prisma.candidateApplication.findUniqueOrThrow({ where: { id: second.id } })).status, 'offer_sent')
    }
  })

  await t.test('database constraints reject second accepted applications and offers outside the API', async () => {
    const { project, applications: [first, second] } = await createProject()
    assert.equal((await accept(first.id)).statusCode, 200)
    await assert.rejects(
      prisma.candidateApplication.update({ where: { id: second.id }, data: { status: 'offer_accepted' } }),
      { code: 'P2002' },
    )
    await assert.rejects(
      prisma.offer.create({ data: {
        projectId: project.id, candidateApplicationId: second.id, status: 'offer_accepted', createdByUserId: hr.id,
      } }),
      { code: 'P2002' },
    )
    await assertOneHire(project.id, first.id, second.id)
  })
})
