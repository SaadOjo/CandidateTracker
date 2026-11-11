import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../../src/app.js'
import { createAuthService } from '../../src/auth.js'

const databaseUrl = process.env.TEST_DATABASE_URL
if (!databaseUrl || !new URL(databaseUrl).pathname.includes('_test')) {
  throw new Error('TEST_DATABASE_URL must explicitly name an isolated _test database')
}

test('database-backed authentication, permissions, notes and candidate journey', async (t) => {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl })
  const prefix = `test-${randomUUID()}`
  const password = randomUUID()
  const app = await buildApp({
    prisma, authService: createAuthService(prisma, password), logger: false,
    config: { databaseUrl, host: '127.0.0.1', port: 4000, origins: ['http://localhost:5174'], developmentPassword: password },
  })
  let projectId: string | undefined
  t.after(async () => {
    await app.close()
    if (projectId) await prisma.project.delete({ where: { id: projectId } })
    await prisma.candidate.deleteMany({ where: { id: { startsWith: prefix } } })
    await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } })
    await prisma.$disconnect()
  })

  const hr = await prisma.user.create({ data: { id: `${prefix}-hr`, oidcSubject: `${prefix}-hr`, email: `${prefix}-hr@example.test`, name: 'Test Human Resource', role: 'human_resource' } })
  const manager = await prisma.user.create({ data: { id: `${prefix}-manager`, oidcSubject: `${prefix}-manager`, email: `${prefix}-manager@example.test`, name: 'Test Hiring Manager', role: 'hiring_manager' } })
  const login = async (email: string) => {
    const response = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password } })
    assert.equal(response.statusCode, 200, response.body)
    assert.match(String(response.headers['set-cookie']), /HttpOnly/)
    return response.cookies[0].value
  }
  const hrToken = await login(hr.email)
  const managerToken = await login(manager.email)
  const hrCookie = { candidate_tracker_session: hrToken }
  const managerCookie = { candidate_tracker_session: managerToken }

  await t.test('Hiring Manager cannot import or synchronize simulator projects', async () => {
    for (const url of ['/integrations/rsc-simulator/import', '/projects/example/simulator-sync']) {
      assert.equal((await app.inject({ method: 'POST', url, cookies: managerCookie, payload: {} })).statusCode, 403)
    }
    assert.equal((await app.inject({ url: '/integrations/rsc-simulator/project', cookies: managerCookie })).statusCode, 403)
    assert.equal((await app.inject({ url: '/integrations/rsc-simulator/projects', cookies: managerCookie })).statusCode, 403)
  })

  await t.test('sessions are hashed in storage and invalid credentials fail', async () => {
    const stored = await prisma.webSession.findFirstOrThrow({ where: { userId: hr.id } })
    assert.notEqual(stored.tokenHash, hrToken)
    const response = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: hr.email, password: 'incorrect' } })
    assert.equal(response.statusCode, 401)
  })

  await t.test('Human Resource creates a project; Hiring Manager cannot', async () => {
    const payload = { name: 'Integration project', position: 'Engineer', hiringManagerUserIds: [manager.id], assignedHumanResourceUserIds: [hr.id] }
    const denied = await app.inject({ method: 'POST', url: '/projects', cookies: managerCookie, payload })
    assert.equal(denied.statusCode, 403)
    const response = await app.inject({ method: 'POST', url: '/projects', cookies: hrCookie, payload })
    assert.equal(response.statusCode, 201, response.body)
    projectId = response.json().id
    assert.equal(response.json().members, undefined)
    assert.doesNotMatch(response.body, /oidcSubject|tokenHash/)
  })
  assert.ok(projectId)
  await t.test('project records its creator and concurrent comment saves keep one author entry', async () => {
    const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } })
    assert.equal(project.createdByUserId, hr.id)
    const responses = await Promise.all(['First edit', 'Second edit'].map((body) => app.inject({ method: 'PATCH', url: `/projects/${projectId}/stage-comments/pre_interview`, cookies: managerCookie, payload: { body } })))
    responses.forEach((response) => assert.equal(response.statusCode, 200, response.body))
    assert.equal(await prisma.projectStageComment.count({ where: { projectId, authorUserId: manager.id } }), 1)
  })
  const candidate = await prisma.candidate.create({ data: { id: `${prefix}-candidate`, fullName: 'Test Candidate', source: 'manual' } })
  const application = await prisma.candidateApplication.create({ data: { projectId, candidateId: candidate.id, stage: 'pre_interview', status: 'waiting_for_contact' } })
  const path = `/candidates/${application.id}`
  const transition = (token: string, action: string, extra: Record<string, unknown> = {}) => app.inject({ method: 'POST', url: `${path}/transition`, cookies: { candidate_tracker_session: token }, payload: { action, ...extra } })

  await t.test('notes update in place and private content never reaches hiring manager responses', async () => {
    const first = await app.inject({ method: 'PUT', url: `${path}/note`, cookies: hrCookie, payload: { body: 'Initial note', visibility: 'all' } })
    assert.equal(first.statusCode, 200, first.body)
    const original = first.json().notes[0]
    const second = await app.inject({ method: 'PUT', url: `${path}/note`, cookies: hrCookie, payload: { fields: [{ question: 'Salary', answer: 'Private value', visibility: 'human_resource_only' }, { question: 'Experience', answer: 'Public value', visibility: 'all' }], visibility: 'all' } })
    assert.equal(second.statusCode, 200, second.body)
    assert.equal(second.json().notes.length, 1)
    assert.equal(second.json().notes[0].id, original.id)
    assert.equal(second.json().notes[0].createdAt, original.createdAt)
    assert.equal(second.json().notes[0].body, null)
    assert.ok(new Date(second.json().notes[0].updatedAt) >= new Date(original.updatedAt))
    for (const url of [path, `/candidates?projectId=${projectId}`]) {
      const response = await app.inject({ url, cookies: managerCookie })
      assert.equal(response.statusCode, 200, response.body)
      assert.doesNotMatch(response.body, /Private value|Salary/)
      assert.match(response.body, /Public value/)
    }
    assert.equal(await prisma.candidateNote.count({ where: { candidateApplicationId: application.id } }), 1)
  })

  await t.test('a person ID cannot ambiguously select one of their applications', async () => {
    const response = await app.inject({ url: `/candidates/${candidate.id}`, cookies: hrCookie })
    assert.equal(response.statusCode, 404)
  })

  await t.test('legacy private-field migration preserves confidentiality and field order', async () => {
    const fields = [
      { question: 'Legacy private', answer: 'Never disclose', visibility: 'hr_only' },
      { question: 'Public field', answer: 'Public answer', visibility: 'all' },
    ]
    await prisma.candidateNote.update({ where: { candidateApplicationId_authorUserId: { candidateApplicationId: application.id, authorUserId: hr.id } }, data: { fields } })
    const migration = await readFile(new URL('../../prisma/migrations/20261111000000_normalize_note_field_visibility/migration.sql', import.meta.url), 'utf8')
    await prisma.$executeRawUnsafe(migration)
    const stored = await prisma.candidateNote.findUniqueOrThrow({ where: { candidateApplicationId_authorUserId: { candidateApplicationId: application.id, authorUserId: hr.id } } })
    assert.deepEqual(stored.fields, [{ ...fields[0], visibility: 'human_resource_only' }, fields[1]])
    const response = await app.inject({ url: path, cookies: managerCookie })
    assert.equal(response.statusCode, 200, response.body)
    assert.doesNotMatch(response.body, /Never disclose|Legacy private/)
  })

  await t.test('role and state violations leave data unchanged', async () => {
    assert.equal((await transition(managerToken, 'mark_not_reached', { occurredAt: new Date().toISOString() })).statusCode, 403)
    assert.equal((await transition(hrToken, 'move_to_department_interview')).statusCode, 409)
    assert.equal(await prisma.activityEvent.count({ where: { candidateApplicationId: application.id } }), 0)
  })

  await t.test('contact and movement persist without scheduling an interview implicitly', async () => {
    assert.equal((await transition(hrToken, 'mark_contact_successful', { occurredAt: new Date().toISOString(), notes: 'Screening completed' })).statusCode, 200)
    const moved = await transition(hrToken, 'move_to_department_interview')
    assert.equal(moved.statusCode, 200, moved.body)
    assert.equal(moved.json().status, 'waiting_for_contact')
    assert.equal(moved.json().interview, null)
    assert.equal(await prisma.interview.count({ where: { candidateApplicationId: application.id } }), 0)
  })

  await t.test('scheduling requires real inputs and records interview, contact and actor together', async () => {
    assert.equal((await transition(hrToken, 'schedule_department_interview')).statusCode, 400)
    assert.equal(await prisma.interview.count({ where: { candidateApplicationId: application.id } }), 0)
    const response = await transition(hrToken, 'schedule_department_interview', { occurredAt: new Date().toISOString(), interviewStartAt: '2026-11-20T10:00:00Z', meetingUrl: 'https://meet.example.test/department', notes: 'Confirmed by phone' })
    assert.equal(response.statusCode, 200, response.body)
    assert.equal(response.json().interview.meetingUrl, 'https://meet.example.test/department')
    assert.equal(response.json().activity.at(-1).actor.id, hr.id)
    assert.equal(response.json().activity.at(-1).subtitle, 'Confirmed by phone')
    assert.equal(await prisma.contactAttempt.count({ where: { candidateApplicationId: application.id } }), 2)
  })

  await t.test('concurrent department decisions cannot create duplicate movement events', async () => {
    const responses = await Promise.all([transition(managerToken, 'move_to_hr_interview'), transition(managerToken, 'move_to_hr_interview')])
    assert.deepEqual(responses.map((response) => response.statusCode).sort(), [200, 409])
    assert.equal(await prisma.activityEvent.count({ where: { candidateApplicationId: application.id, eventType: 'move_to_hr_interview' } }), 1)
    const response = await app.inject({ url: path, cookies: hrCookie })
    assert.equal(response.json().interview, null)
  })

  await t.test('assessment, shared review and offer actions persist through acceptance', async () => {
    for (const [token, action] of [[hrToken, 'send_assessment'], [hrToken, 'move_to_candidate_review'], [managerToken, 'approve_for_offer'], [hrToken, 'send_final_check'], [hrToken, 'send_offer'], [hrToken, 'offer_accepted']]) {
      const response = await transition(token, action)
      assert.equal(response.statusCode, 200, `${action}: ${response.body}`)
    }
    const offer = await prisma.offer.findFirstOrThrow({ where: { candidateApplicationId: application.id } })
    assert.equal(offer.status, 'offer_accepted')
    const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } })
    assert.equal(project.hiredApplicationId, application.id)
    assert.equal((await transition(hrToken, 'reject')).statusCode, 409)
  })

  await t.test('concurrent rejection handling records exactly one completed contact', async () => {
    const person = await prisma.candidate.create({ data: { id: `${prefix}-rejected`, fullName: 'Rejected Test Candidate', source: 'manual' } })
    const rejected = await prisma.candidateApplication.create({ data: { projectId: projectId!, candidateId: person.id, stage: 'manager_review', status: 'rejected' } })
    const followUp = await prisma.rejectionFollowUp.create({ data: { projectId: projectId!, candidateApplicationId: rejected.id, reason: 'rejected', eligibleAt: new Date() } })
    const responses = await Promise.all([1, 2].map(() => app.inject({ method: 'POST', url: `/rejection-follow-ups/${followUp.id}/contact-attempts`, cookies: hrCookie, payload: { result: 'rejection_handled', attemptedAt: new Date().toISOString(), notes: 'Informed candidate' } })))
    assert.deepEqual(responses.map((response) => response.statusCode).sort(), [200, 409])
    assert.equal(await prisma.contactAttempt.count({ where: { rejectionFollowUpId: followUp.id } }), 1)
  })

  await t.test('logout revokes the session in the database', async () => {
    assert.equal((await app.inject({ method: 'POST', url: '/auth/logout', cookies: hrCookie })).statusCode, 200)
    assert.equal((await app.inject({ url: '/projects', cookies: hrCookie })).statusCode, 401)
    assert.equal(await prisma.webSession.count({ where: { userId: hr.id } }), 0)
  })
})
