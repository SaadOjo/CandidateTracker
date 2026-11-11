import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { TrackerApi, DEMO_PASSWORD } from '../src/api'
import { RscSource } from '../src/rsc'
import { WorkspaceStorage } from '../src/storage'
import type { SqlAdapter } from '../src/storage'
import { users } from '../src/model'

function setup() {
  const db = new DatabaseSync(':memory:')
  const sql: SqlAdapter = { exec(query, ...bindings) { const stmt = db.prepare(query); if (stmt.columns().length) return stmt.all(...bindings); stmt.run(...bindings); return [] } }
  const store = new WorkspaceStorage(sql)
  const snapshot = { contract: 'candidate-tracker-simulator-project-v1', integrationContext: 'urn:li:organization:test',
    project: { id: 'one', name: 'Test Project', position: 'Engineer', company: 'Demo', location: 'Remote', owner: 'Demo', referenceEntityType: 'REQUISITION', referenceEntityId: 'one' }, pipelineStages: ['shortlisted'],
    candidates: [{ id: 'person1', firstName: 'Test', lastName: 'Candidate', headline: '', currentEmployerNames: [], location: { locationName: 'Remote', countryCode: 'US' }, member: 'urn:li:person:one', profileUrl: 'https://linkedin.invalid/test', email: 'test@example.com', phone: '+12025550111', stage: 'shortlisted' }] }
  let hold: Promise<void> | undefined
  const fetchSource: typeof fetch = async (input, init) => {
    assert.equal(init?.redirect, 'manual')
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-token')
    assert.match(String(input), /^https:\/\/rsc-test-demo\.saadsaif0333\.workers\.dev\//)
    await hold
    return Response.json(String(input).includes('/simulator/projects') ? { projects: [{ id: 'one', name: 'Test Project', exportedAt: 1 }] } : snapshot)
  }
  const source = new RscSource('test-token', fetchSource)
  const api = new TrackerApi(store, source)
  const call = (path: string, method = 'GET', payload?: unknown, cookie?: string) => api.fetch(new Request(`https://tracker.test/api${path}`, {
    method, headers: { ...(cookie ? { cookie } : {}), ...(payload ? { 'Content-Type': 'application/json' } : {}) }, body: payload ? JSON.stringify(payload) : undefined,
  }))
  const login = async (index: number) => {
    const result = await call('/auth/login', 'POST', { email: users[index].email, password: DEMO_PASSWORD })
    assert.equal(result.status, 200)
    assert.match(result.headers.get('set-cookie')!, /HttpOnly; SameSite=Lax; Path=\/api; Max-Age=86400; Secure/)
    return result.headers.get('set-cookie')!.split(';')[0]
  }
  return { db, store, api, source, call, login, hold: (promise?: Promise<void>) => { hold = promise } }
}
const assignment = { sourceProjectId: 'one', hiringManagerUserIds: [users[1].id], assignedHumanResourceUserIds: [users[0].id] }

test('interview scheduling stores meeting links without a protocol prefix', async () => {
  const env = setup()
  try {
    const hr = await env.login(0)
    await env.call('/integrations/rsc-simulator/import', 'POST', assignment, hr)
    for (const stage of ['department_interview', 'hr_interview'] as const) {
      const state = env.store.read()
      const candidate = state.candidates[0]
      candidate.stage = stage
      candidate.status = 'waiting_for_contact'
      env.store.write(state)
      const response = await env.call(`/candidates/${candidate.id}/transition`, 'POST', {
        action: `schedule_${stage}`, occurredAt: '2026-11-11T10:00:00Z', interviewStartAt: '2026-11-12T10:00:00Z', meetingUrl: 'meet.google.com/abc-defg-hij',
      }, hr)
      assert.equal(response.status, 200)
      assert.equal(env.store.read().candidates[0].interview?.meetingUrl, 'meet.google.com/abc-defg-hij')
    }
  } finally { env.db.close() }
})

test('HTTP import, role switching, comments, private notes and reset are consistent', async () => {
  const env = setup()
  try {
    const { call } = env
    assert.equal((await call('/projects')).status, 401)
    const hr = await env.login(0), hm = await env.login(1)
    assert.equal((await call('/integrations/rsc-simulator/import', 'POST', assignment, hm)).status, 403)
    const imported = await call('/integrations/rsc-simulator/import', 'POST', assignment, hr)
    assert.equal(imported.status, 201)
    const project = await imported.json() as { id: string; candidateCount: number }
    assert.equal(project.candidateCount, 1)
    assert.equal((await call('/integrations/rsc-simulator/import', 'POST', assignment, hr)).status, 409)
    const candidateId = env.store.read().candidates[0].id
    const commentPath = `/projects/${project.id}/stage-comments/pre_interview`
    assert.equal((await call(commentPath, 'PATCH', { body: 'Manager comment' }, hm)).status, 200)
    assert.equal((await call(commentPath, 'PATCH', { body: 'HR comment' }, hr)).status, 403)
    assert.match(await (await call(`/projects/${project.id}`, 'GET', undefined, hr)).text(), /Manager comment/)
    assert.equal((await call(`/candidates/${candidateId}/note`, 'PUT', { visibility: 'human_resource_only', body: 'Private HR note' }, hr)).status, 200)
    assert.doesNotMatch(await (await call(`/candidates/${candidateId}`, 'GET', undefined, hm)).text(), /Private HR note/)
    assert.equal((await call('/demo/reset', 'POST', { confirmation: 'DELETE ALL TEST DATA' }, hm)).status, 403)
    assert.equal((await call('/demo/reset', 'POST', { confirmation: 'wrong' }, hr)).status, 400)
    assert.equal(env.store.read().projects.length, 1)
    const reset = await call('/demo/reset', 'POST', { confirmation: 'DELETE ALL TEST DATA' }, hr)
    assert.equal(reset.status, 200)
    assert.deepEqual(await reset.json(), { projects: 1, candidates: 1 })
    assert.equal(env.store.read().people.length, 0)
    assert.equal((await call(`/candidates/${candidateId}`, 'GET', undefined, hr)).status, 404)
    assert.equal((await call('/integrations/rsc-simulator/import', 'POST', assignment, hr)).status, 201)
    assert.equal((await call('/auth/logout', 'POST', undefined, hr)).status, 200)
    assert.equal((await call('/projects', 'GET', undefined, hr)).status, 401)
  } finally { env.db.close() }
})

test('reset prevents an in-flight import or sync from repopulating candidates', async () => {
  const env = setup()
  try {
    const hr = await env.login(0)
    await env.call('/integrations/rsc-simulator/import', 'POST', assignment, hr)
    const projectId = env.store.read().projects[0].id
    let release!: () => void
    env.hold(new Promise(resolve => { release = resolve }))
    const syncing = env.api.sync(projectId)
    await env.call('/demo/reset', 'POST', { confirmation: 'DELETE ALL TEST DATA' }, hr)
    release()
    await assert.rejects(syncing, /reset/)
    assert.equal(env.store.read().candidates.length, 0)
    env.hold(new Promise(resolve => { release = resolve }))
    const importing = env.call('/integrations/rsc-simulator/import', 'POST', assignment, hr)
    // Wait for auth/body parsing so the source request is in flight.
    await new Promise(resolve => setTimeout(resolve, 30))
    await env.call('/demo/reset', 'POST', { confirmation: 'DELETE ALL TEST DATA' }, hr)
    release()
    assert.equal((await importing).status, 409)
    assert.equal(env.store.read().projects.length, 0)
  } finally { env.db.close() }
})

test('concurrent duplicate imports produce one project and one candidate', async () => {
  const env = setup()
  try {
    const hr = await env.login(0)
    const results = await Promise.all([env.call('/integrations/rsc-simulator/import', 'POST', assignment, hr), env.call('/integrations/rsc-simulator/import', 'POST', assignment, hr)])
    assert.deepEqual(results.map(result => result.status).sort(), [201, 409])
    assert.equal(env.store.read().projects.length, 1)
    assert.equal(env.store.read().candidates.length, 1)
  } finally { env.db.close() }
})
