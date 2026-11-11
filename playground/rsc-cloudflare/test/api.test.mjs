import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { handleApi } from '../api.mjs'
import { WorkspaceStorage } from '../storage.mjs'

function setup(t) {
  const db = new DatabaseSync(':memory:')
  t.after(() => db.close())
  const sql = { exec(query, ...bindings) {
    const statement = db.prepare(query)
    return statement.columns().length ? statement.all(...bindings) : (statement.run(...bindings), [])
  } }
  let storage = new WorkspaceStorage(sql)
  let now = 1_700_000_000_000
  return {
    restart() { storage = new WorkspaceStorage(sql) },
    advance(ms) { now += ms },
    call(path, { method = 'GET', body, headers = {} } = {}) {
      return handleApi(new Request(`https://demo.example${path}`, {
        method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      }), storage, () => now)
    },
    raw(body) { return handleApi(new Request('https://demo.example/simulator/exports?projectId=sim-project-001', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
    }), storage, () => now) },
  }
}
const scope = (path, id = 'sim-project-001') => `${path}?projectId=${id}`
const authorization = { Authorization: 'Bearer rsc-local-test-token' }

test('three projects retain stage changes and published snapshots across restarts', async (t) => {
  const app = setup(t)
  const catalog = await (await app.call('/simulator/projects')).json()
  assert.equal(catalog.projects.length, 3)
  assert.ok(catalog.projects.every((project) => project.candidateCount === 10))
  assert.equal((await app.call(scope('/simulator/project-export'), { headers: authorization })).status, 409)
  assert.equal((await app.call(scope('/simulator/candidates/sim-candidate-01'), { method: 'PATCH', body: { stage: 'shortlisted' } })).status, 200)
  assert.equal((await app.call(scope('/simulator/project-export'), { method: 'POST' })).status, 200)
  const published = await (await app.call(scope('/simulator/project-export'), { headers: authorization })).json()
  assert.equal(published.candidates[0].stage, 'shortlisted')
  assert.equal(published.candidates[0].email, 'sam.taylor@example.com')
  assert.equal(published.candidates[0].phone, '+12025550101')
  await app.call(scope('/simulator/candidates/sim-candidate-02'), { method: 'PATCH', body: { stage: 'replied' } })
  app.restart()
  const state = await (await app.call(scope('/simulator/state'))).json()
  assert.equal(state.candidates[1].stage, 'replied')
  assert.equal(state.projectExport.hasUnexportedChanges, true)
  assert.deepEqual(await (await app.call(scope('/simulator/project-export'), { headers: authorization })).json(), published)
  const other = await (await app.call(scope('/simulator/state', 'sim-project-002'))).json()
  assert.ok(other.candidates.every((person) => person.stage === 'uncontacted'))
  assert.equal(other.projectExport.exportedAt, null)
  const download = await app.call(scope('/simulator/project-download'))
  assert.match(download.headers.get('content-disposition'), /sim-project-001.json/)
  assert.deepEqual(await download.json(), published)
})

test('RSC records, signatures, source identity and expiry survive restart', async (t) => {
  const app = setup(t)
  const response = await app.call(scope('/simulator/exports', 'sim-project-002'), {
    method: 'POST', body: { candidateIds: ['sim-candidate-11'], notes: 'Fictional demo note' },
  })
  assert.equal(response.status, 201)
  const entry = await response.json()
  assert.equal(entry.response.elements[0].candidate.email, undefined)
  assert.equal(entry.response.elements[0].candidate.phone, undefined)
  assert.equal(entry.notificationHeaders['X-LI-Signature'], createHmac('sha256', 'rsc-local-test-secret').update(`hmacsha256=${entry.notificationBody}`).digest('hex'))
  app.restart()
  assert.deepEqual(await (await app.call(`/simulator/exports/${entry.notification.id}`)).json(), entry)
  const result = await app.call(entry.request.path, { headers: entry.request.headers })
  assert.equal(result.status, 200)
  assert.equal((await result.json()).elements[0].referenceEntityId, 'req-demo-002')
  const state = await (await app.call(scope('/simulator/state', 'sim-project-002'))).json()
  assert.equal(state.exports.length, 1)
  assert.equal((await (await app.call(scope('/simulator/state'))).json()).exports.length, 0)
  const download = await app.call(`/simulator/exports/${entry.notification.id}?download=notification`)
  assert.equal(await download.text(), entry.notificationBody)
  assert.equal((await app.call(entry.request.path)).status, 401)
  assert.equal((await app.call(entry.request.path, { headers: { ...authorization, 'LinkedIn-Version': 'wrong' } })).status, 400)
  app.advance(86_400_000)
  assert.equal((await app.call(entry.request.path, { headers: entry.request.headers })).status, 410)
})

test('all thirty demo candidates have distinct fictional contact details', async (t) => {
  const app = setup(t)
  const people = []
  for (const id of ['sim-project-001', 'sim-project-002', 'sim-project-003']) {
    const state = await (await app.call(scope('/simulator/state', id))).json()
    people.push(...state.candidates)
    await app.call(scope('/simulator/project-export', id), { method: 'POST' })
    const published = await (await app.call(scope('/simulator/project-export', id), { headers: authorization })).json()
    assert.deepEqual(published.candidates, state.candidates)
  }
  assert.equal(people.length, 30)
  assert.equal(new Set(people.map((person) => person.email)).size, 30)
  assert.equal(new Set(people.map((person) => person.phone)).size, 30)
  for (const person of people) {
    assert.match(person.email, /^[a-z]+\.[a-z]+@example\.com$/)
    assert.match(person.phone, /^\+120255501\d{2}$/)
  }
})

test('invalid inputs fail without changing project state', async (t) => {
  const app = setup(t)
  for (const [path, status] of [['/simulator/state', 400], [scope('/simulator/state', 'unknown'), 404], ['/simulator/exports/unknown', 404], ['/missing', 404]]) {
    assert.equal((await app.call(path)).status, status)
  }
  assert.equal((await app.raw('{')).status, 400)
  assert.equal((await app.raw('x'.repeat(16_385))).status, 413)
  assert.equal((await app.call(scope('/simulator/exports'), { method: 'POST' })).status, 415)
  for (const body of [null, [], { stage: 'invalid' }, { stage: 'shortlisted', extra: true }]) {
    assert.equal((await app.call(scope('/simulator/candidates/sim-candidate-01'), { method: 'PATCH', body })).status, 400)
  }
  assert.equal((await app.call(scope('/simulator/candidates/sim-candidate-11'), { method: 'PATCH', body: { stage: 'shortlisted' } })).status, 404)
  for (const body of [{ candidateIds: [] }, { candidateIds: ['unknown'] }, { candidateIds: ['sim-candidate-01'], notes: 'x'.repeat(2001) }]) {
    assert.equal((await app.call(scope('/simulator/exports'), { method: 'POST', body })).status, 400)
  }
  const state = await (await app.call(scope('/simulator/state'))).json()
  assert.equal(state.exports.length, 0)
  assert.ok(state.candidates.every((person) => person.stage === 'uncontacted'))
})

test('concurrent stage requests retain both updates', async (t) => {
  const app = setup(t)
  await Promise.all([
    app.call(scope('/simulator/candidates/sim-candidate-01'), { method: 'PATCH', body: { stage: 'shortlisted' } }),
    app.call(scope('/simulator/candidates/sim-candidate-02'), { method: 'PATCH', body: { stage: 'contacted' } }),
  ])
  app.restart()
  const state = await (await app.call(scope('/simulator/state'))).json()
  assert.equal(state.candidates[0].stage, 'shortlisted')
  assert.equal(state.candidates[1].stage, 'contacted')
})
