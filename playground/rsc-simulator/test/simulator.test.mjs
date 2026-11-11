import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { once } from 'node:events'
import { get } from 'node:http'
import { test } from 'node:test'
import { createSimulator } from '../simulator.mjs'
import { buildServer } from '../server.mjs'
import { demoProjects } from '../fixtures.mjs'

const token = 'test-token'
const secret = 'test-secret'
const fixedTime = Date.parse('2026-11-11T12:00:00Z')
const create = (options = {}) => createSimulator({ token, secret, projectId: 'sim-project-001', clock: () => fixedTime, ...options })
const input = { candidateIds: ['sim-candidate-01', 'sim-candidate-02'], notes: 'Test shortlist' }
const retrieve = (simulator, id, options = {}) => simulator.retrieveExport({
  authorization: `Bearer ${token}`, version: '202604', query: 'request', requestId: id, ...options,
})

test('one fictional project contains ten stable candidates and no private contact data', () => {
  const state = create().snapshot()
  assert.equal(state.project.referenceEntityId, 'req-demo-001')
  assert.equal(state.candidates.length, 10)
  assert.equal(new Set(state.candidates.map((person) => person.member)).size, 10)
  for (const person of state.candidates) {
    assert.equal(new URL(person.profileUrl).hostname, 'linkedin.invalid')
    assert.equal(person.emailAddresses, undefined)
  }
})

test('project export includes every source stage, including the custom shortlisted stage', () => {
  const simulator = create()
  simulator.moveCandidate('sim-candidate-01', 'shortlisted')
  simulator.moveCandidate('sim-candidate-02', 'contacted')
  simulator.moveCandidate('sim-candidate-03', 'replied')
  simulator.publishProject()
  const snapshot = simulator.retrieveProject(`Bearer ${token}`)
  assert.equal(snapshot.contract, 'candidate-tracker-simulator-project-v1')
  assert.equal(snapshot.candidates.length, 10)
  assert.equal(snapshot.candidates.filter((person) => person.stage === 'shortlisted').length, 1)
  assert.deepEqual(new Set(snapshot.candidates.map((person) => person.stage)), new Set(snapshot.pipelineStages))
  assert.throws(() => simulator.retrieveProject('Bearer wrong'), { status: 401 })
  assert.throws(() => simulator.moveCandidate('unknown', 'shortlisted'), { status: 404 })
  assert.throws(() => simulator.moveCandidate('sim-candidate-01', 'invalid'), { status: 400 })
  assert.equal(create().snapshot().candidates[0].stage, 'uncontacted')
})

test('stage changes remain private to the simulator until the project is explicitly exported', () => {
  let now = fixedTime
  const simulator = create({ clock: () => now })
  assert.deepEqual(simulator.snapshot().projectExport, { exportedAt: null, hasUnexportedChanges: true })
  simulator.moveCandidate('sim-candidate-01', 'shortlisted')
  simulator.prepareExport(input)
  assert.throws(() => simulator.retrieveProject(`Bearer ${token}`), { status: 409 })
  assert.deepEqual(simulator.publishProject(), { exportedAt: fixedTime, hasUnexportedChanges: false })
  const first = simulator.retrieveProject(`Bearer ${token}`)
  simulator.moveCandidate('sim-candidate-02', 'shortlisted')
  assert.equal(simulator.snapshot().projectExport.hasUnexportedChanges, true)
  assert.deepEqual(simulator.retrieveProject(`Bearer ${token}`), first)
  simulator.moveCandidate('sim-candidate-02', 'uncontacted')
  assert.equal(simulator.snapshot().projectExport.hasUnexportedChanges, false)
  simulator.moveCandidate('sim-candidate-02', 'shortlisted')
  now += 1000
  assert.deepEqual(simulator.publishProject(), { exportedAt: now, hasUnexportedChanges: false })
  assert.equal(simulator.retrieveProject(`Bearer ${token}`).candidates[1].stage, 'shortlisted')
  assert.equal(first.candidates[1].stage, 'uncontacted')
  first.candidates[0].stage = 'replied'
  assert.equal(simulator.retrieveProject(`Bearer ${token}`).candidates[0].stage, 'shortlisted')
  assert.throws(() => create().retrieveProject(`Bearer ${token}`), { status: 409 })
})

test('three demo projects have independent candidates, stages, exports and requisitions', () => {
  const simulators = demoProjects.map(({ project }) => create({ projectId: project.id }))
  assert.equal(simulators.length, 3)
  const snapshots = simulators.map((simulator) => simulator.snapshot())
  assert.ok(snapshots.every((snapshot) => snapshot.candidates.length === 10))
  assert.equal(new Set(snapshots.flatMap((snapshot) => snapshot.candidates.map((candidate) => candidate.member))).size, 30)
  simulators[1].moveCandidate('sim-candidate-11', 'shortlisted')
  simulators[1].publishProject()
  assert.equal(simulators[1].retrieveProject(`Bearer ${token}`).candidates[0].stage, 'shortlisted')
  assert.equal(simulators[0].snapshot().candidates[0].stage, 'uncontacted')
  assert.throws(() => simulators[0].retrieveProject(`Bearer ${token}`), { status: 409 })
  assert.throws(() => simulators[2].moveCandidate('sim-candidate-11', 'shortlisted'), { status: 404 })
  const entry = simulators[1].prepareExport({ candidateIds: ['sim-candidate-11'] })
  assert.equal(entry.response.elements[0].referenceEntityId, 'req-demo-002')
  assert.equal(simulators[0].snapshot().exports.length, 0)
  assert.equal(simulators[1].snapshot().exports.length, 1)
  assert.throws(() => create({ projectId: 'unknown' }), { status: 404 })
})

test('export uses documented notification and versioned candidate response fields', () => {
  const simulator = create()
  const entry = simulator.prepareExport(input)
  assert.equal(entry.notification.type, 'EXPORT_CANDIDATE_PROFILE')
  assert.equal(entry.notification.expiresAt, fixedTime + 86_400_000)
  assert.equal(entry.response.elements.length, 2)
  for (const record of entry.response.elements) {
    assert.equal(record.referenceEntityType, 'REQUISITION')
    assert.equal(record.referenceEntityId, 'req-demo-001')
    assert.equal(record.integrationContext, 'urn:li:organization:900000001')
    assert.equal(record.source, 'LINKEDIN')
    assert.equal(record.notes, input.notes)
    assert.equal(record.requestedAt, fixedTime)
    assert.equal(record.candidate.id, undefined)
    assert.equal(typeof record.candidate.location.locationName, 'string')
    assert.equal(record.requester.firstName, 'Alex')
  }
  assert.deepEqual(retrieve(simulator, entry.notification.id), entry.response)
})

test('notification signature covers the documented prefix and exact body bytes', () => {
  const entry = create().prepareExport(input)
  const signature = createHmac('sha256', secret).update('hmacsha256=').update(entry.notificationBody).digest('hex')
  assert.equal(entry.notificationHeaders['X-LI-Signature'], signature)
  assert.deepEqual(JSON.parse(entry.notificationBody), entry.notification)
  assert.notEqual(createHmac('sha256', secret).update(entry.notificationBody).digest('hex'), signature)
})

test('repeated retrieval is stable; re-export has a new request ID and the same candidate IDs', () => {
  const simulator = create()
  const first = simulator.prepareExport(input)
  const second = simulator.prepareExport(input)
  assert.notEqual(first.notification.id, second.notification.id)
  assert.deepEqual(retrieve(simulator, first.notification.id), retrieve(simulator, first.notification.id))
  assert.deepEqual(first.response.elements, second.response.elements)
  assert.equal(simulator.snapshot().candidates.length, 10)
})

test('malformed selections, unknown IDs and oversized notes fail without creating exports', () => {
  const simulator = create()
  for (const invalid of [null, [], {}, { candidateIds: [] }, { candidateIds: ['unknown'] },
    { candidateIds: ['sim-candidate-01', 'sim-candidate-01'] }, { ...input, notes: 'a'.repeat(2001) },
    { ...input, callbackUrl: 'https://example.test' }]) {
    assert.throws(() => simulator.prepareExport(invalid), { status: 400 })
  }
  assert.equal(simulator.snapshot().exports.length, 0)
})

test('all ten candidates can be exported and blank optional notes are omitted', () => {
  const simulator = create()
  const entry = simulator.prepareExport({ candidateIds: simulator.snapshot().candidates.map((person) => person.id) })
  assert.equal(entry.response.paging.total, 10)
  assert.equal(entry.response.elements[0].notes, undefined)
})

test('token, version, request identifier and expiry are enforced', () => {
  let now = fixedTime
  const simulator = create({ clock: () => now })
  const { notification } = simulator.prepareExport(input)
  assert.throws(() => retrieve(simulator, notification.id, { authorization: undefined }), { status: 401 })
  assert.throws(() => retrieve(simulator, notification.id, { version: '202507' }), { status: 400 })
  assert.throws(() => retrieve(simulator, notification.id, { query: 'all' }), { status: 400 })
  assert.throws(() => retrieve(simulator, 'unknown'), { status: 404 })
  now = notification.expiresAt - 1
  assert.equal(retrieve(simulator, notification.id).elements.length, 2)
  now += 1
  assert.throws(() => retrieve(simulator, notification.id), { status: 410 })
})

test('HTTP export and retrieval work, while invalid JSON and cross-origin writes fail', async (t) => {
  const server = buildServer({ token, secret, clock: () => fixedTime })
  t.after(() => new Promise((resolve) => server.close(resolve)))
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}`
  // Scope the original single-project HTTP scenarios explicitly to the first fixture.
  const fetch = (input, init) => {
    const url = new URL(input)
    if (['/simulator/state', '/simulator/project-export', '/simulator/project-download', '/simulator/exports'].includes(url.pathname) || url.pathname.startsWith('/simulator/candidates/')) {
      url.searchParams.set('projectId', 'sim-project-001')
    }
    return globalThis.fetch(url, init)
  }
  const initial = await fetch(`${base}/simulator/state`)
  assert.equal(initial.status, 200)
  assert.equal(initial.headers.get('access-control-allow-origin'), null)
  const moved = await fetch(`${base}/simulator/candidates/sim-candidate-01`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: 'shortlisted' }),
  })
  assert.equal(moved.status, 200)
  assert.equal((await fetch(`${base}/simulator/project-export`)).status, 401)
  const headers = { Authorization: `Bearer ${token}` }
  assert.equal((await fetch(`${base}/simulator/project-export`, { headers })).status, 409)
  assert.equal((await fetch(`${base}/simulator/project-download`)).status, 409)
  assert.equal((await fetch(`${base}/simulator/project-export`, { method: 'POST', headers: { Origin: 'https://example.test' } })).status, 403)
  assert.equal((await fetch(`${base}/simulator/project-export`, { headers })).status, 409)
  const published = await fetch(`${base}/simulator/project-export`, { method: 'POST', headers: { Origin: base } })
  assert.equal(published.status, 200)
  assert.deepEqual(await published.json(), { exportedAt: fixedTime, hasUnexportedChanges: false })
  const projectExport = await fetch(`${base}/simulator/project-export`, { headers: { Authorization: `Bearer ${token}` } })
  assert.equal(projectExport.status, 200)
  const projectSnapshot = await projectExport.json()
  assert.equal(projectSnapshot.candidates.length, 10)
  assert.equal(projectSnapshot.candidates[0].stage, 'shortlisted')
  const projectDownload = await fetch(`${base}/simulator/project-download`)
  assert.match(projectDownload.headers.get('content-disposition'), /^attachment;/)
  assert.deepEqual(await projectDownload.json(), projectSnapshot)
  await fetch(`${base}/simulator/candidates/sim-candidate-02`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: 'shortlisted' }),
  })
  assert.deepEqual(await (await fetch(`${base}/simulator/project-export`, { headers })).json(), projectSnapshot)
  assert.deepEqual(await (await fetch(`${base}/simulator/project-download`)).json(), projectSnapshot)
  await fetch(`${base}/simulator/project-export`, { method: 'POST' })
  assert.equal((await (await fetch(`${base}/simulator/project-export`, { headers })).json()).candidates[1].stage, 'shortlisted')
  const badStage = await fetch(`${base}/simulator/candidates/sim-candidate-01`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: 'invalid' }),
  })
  assert.equal(badStage.status, 400)
  const prepared = await fetch(`${base}/simulator/exports`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify(input),
  })
  assert.equal(prepared.status, 201)
  const entry = await prepared.json()
  const retrieved = await fetch(`${base}${entry.request.path}`, { headers: entry.request.headers })
  assert.equal(retrieved.status, 200)
  assert.deepEqual(await retrieved.json(), entry.response)
  const downloaded = await fetch(`${base}/simulator/exports/${entry.notification.id}?download=notification`)
  assert.equal(downloaded.status, 200)
  assert.match(downloaded.headers.get('content-disposition'), /^attachment;/)
  assert.equal(await downloaded.text(), entry.notificationBody)
  assert.equal((await fetch(`${base}/simulator/exports/${entry.notification.id}?download=invalid`)).status, 400)
  assert.equal((await fetch(`${base}${entry.request.path}`)).status, 401)
  const badJson = await fetch(`${base}/simulator/exports`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  })
  assert.equal(badJson.status, 400)
  const crossOrigin = await fetch(`${base}/simulator/exports`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://example.test' }, body: JSON.stringify(input),
  })
  assert.equal(crossOrigin.status, 403)
  const wrongHostStatus = await new Promise((resolve, reject) => {
    get(`${base}/simulator/state`, { headers: { Host: 'example.test' } }, (response) => {
      response.resume()
      resolve(response.statusCode)
    }).on('error', reject)
  })
  assert.equal(wrongHostStatus, 403)
  const state = await (await fetch(`${base}/simulator/state`)).json()
  assert.equal(state.exports.length, 1)
  for (const path of ['/', '/app.js', '/styles.css', '/mark.svg']) {
    assert.equal((await fetch(`${base}${path}`)).status, 200, path)
  }
})

test('HTTP project selection is explicit and changing projects does not redirect exports', async (t) => {
  const server = buildServer({ token, secret })
  t.after(() => new Promise((resolve) => server.close(resolve)))
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}`
  const headers = { Authorization: `Bearer ${token}` }
  const catalog = await (await fetch(`${base}/simulator/projects`)).json()
  assert.equal(catalog.projects.length, 3)
  assert.equal((await fetch(`${base}/simulator/state`)).status, 400)
  assert.equal((await fetch(`${base}/simulator/state?projectId=unknown`)).status, 404)
  await fetch(`${base}/simulator/candidates/sim-candidate-11?projectId=sim-project-002`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: 'shortlisted' }),
  })
  await fetch(`${base}/simulator/project-export?projectId=sim-project-002`, { method: 'POST' })
  await fetch(`${base}/simulator/state?projectId=sim-project-001`)
  const second = await (await fetch(`${base}/simulator/project-export?projectId=sim-project-002`, { headers })).json()
  assert.equal(second.project.name, 'Product Designer')
  assert.equal(second.candidates[0].stage, 'shortlisted')
  assert.equal((await fetch(`${base}/simulator/project-export?projectId=sim-project-001`, { headers })).status, 409)
  for (const [projectId, candidateId, reference] of [['sim-project-001', 'sim-candidate-01', 'req-demo-001'], ['sim-project-002', 'sim-candidate-11', 'req-demo-002']]) {
    const entry = await (await fetch(`${base}/simulator/exports?projectId=${projectId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidateIds: [candidateId] }),
    })).json()
    const response = await (await fetch(`${base}${entry.request.path}`, { headers: entry.request.headers })).json()
    assert.equal(response.elements[0].referenceEntityId, reference)
  }
})
