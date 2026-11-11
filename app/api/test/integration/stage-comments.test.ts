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

test('only hiring managers write pre-interview comments and both roles read them', async (t) => {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl })
  const prefix = `test-comments-${randomUUID()}`
  const password = randomUUID()
  const app = await buildApp({
    prisma, authService: createAuthService(prisma, password), logger: false,
    config: { databaseUrl, host: '127.0.0.1', port: 4000, origins: ['http://localhost:5174'], developmentPassword: password },
  })
  t.after(async () => {
    await app.close()
    await prisma.project.deleteMany({ where: { id: prefix } })
    await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } })
    await prisma.$disconnect()
  })

  const cookies: Record<string, { candidate_tracker_session: string }> = {}
  for (const role of ['human_resource', 'hiring_manager', 'admin'] as const) {
    const user = await prisma.user.create({ data: {
      id: `${prefix}-${role}`, oidcSubject: `${prefix}-${role}`,
      email: `${prefix}-${role}@example.test`, name: role, role,
    } })
    const login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: user.email, password } })
    assert.equal(login.statusCode, 200, login.body)
    cookies[role] = { candidate_tracker_session: login.cookies[0].value }
  }
  await prisma.project.create({ data: { id: prefix, name: 'Comment permissions test', position: 'Engineer' } })
  const legacy = await prisma.projectStageComment.create({ data: {
    projectId: prefix, stage: 'pre_interview', authorUserId: `${prefix}-human_resource`, authorRole: 'human_resource', body: 'Legacy HR comment',
  } })
  const url = `/projects/${prefix}/stage-comments/pre_interview`
  for (const role of ['human_resource', 'admin']) {
    const denied = await app.inject({ method: 'PATCH', url, cookies: cookies[role], payload: { body: 'Forbidden edit' } })
    assert.equal(denied.statusCode, 403, denied.body)
  }
  const saves = await Promise.all(['First HM comment', 'Updated HM comment'].map((body) => app.inject({
    method: 'PATCH', url, cookies: cookies.hiring_manager, payload: { body },
  })))
  saves.forEach((response) => assert.equal(response.statusCode, 200, response.body))
  const stored = await prisma.projectStageComment.findMany({ where: { projectId: prefix, authorRole: 'hiring_manager' } })
  assert.equal(stored.length, 1)

  for (const role of ['human_resource', 'hiring_manager']) {
    for (const path of [`/projects/${prefix}`, '/projects']) {
      const response = await app.inject({ url: path, cookies: cookies[role] })
      assert.equal(response.statusCode, 200, response.body)
      const project = path === '/projects' ? response.json().find((item: { id: string }) => item.id === prefix) : response.json()
      assert.equal(project.stageComments.length, 1)
      assert.equal(project.stageComments[0].id, stored[0].id)
      assert.equal(project.stageComments[0].body, stored[0].body)
      assert.equal(project.stageComments[0].authorRole, 'hiring_manager')
    }
  }
  assert.equal((await prisma.projectStageComment.findUniqueOrThrow({ where: { id: legacy.id } })).body, legacy.body)
  assert.equal(await prisma.projectStageComment.count({ where: { projectId: prefix } }), 2)
})
