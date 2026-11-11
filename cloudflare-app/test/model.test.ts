import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { CandidateTransitionSchema } from '../../app/api/src/domain'
import { WorkspaceStorage } from '../src/storage'
import type { SqlAdapter } from '../src/storage'
import { candidateResponse, importProject, saveComment, saveNote, syncCandidates, transition, users } from '../src/model'
import type { SimulatorProject } from '../../app/api/src/features/simulator-import/contract'

const hr = users[0]
const hm = users[1]
const assignment = { hiringManagerUserIds: [hm.id], assignedHumanResourceUserIds: [hr.id] }
function storage() {
  const db = new DatabaseSync(':memory:')
  const sql: SqlAdapter = { exec(query, ...bindings) {
    const statement = db.prepare(query)
    if (statement.columns().length) return statement.all(...bindings)
    statement.run(...bindings)
    return []
  } }
  return { db, sql, store: new WorkspaceStorage(sql) }
}
function snapshot(): SimulatorProject {
  return { contract: 'candidate-tracker-simulator-project-v1', integrationContext: 'urn:li:organization:test',
    project: { id: 'source-project', name: 'Test', position: 'Engineer', company: 'Example', location: 'Remote', owner: 'Example', referenceEntityType: 'REQUISITION', referenceEntityId: 'req1' },
    pipelineStages: ['uncontacted', 'contacted', 'replied', 'shortlisted'],
    candidates: ['one', 'two'].map((key, index) => ({ id: key, firstName: key, lastName: 'Candidate', headline: '', currentEmployerNames: [], location: { locationName: 'Remote', countryCode: 'US' }, member: `urn:li:person:${key}`, profileUrl: `https://linkedin.invalid/${key}`, email: `${key}@example.com`, phone: '+12025550111', stage: index === 0 ? 'shortlisted' : 'uncontacted' })) }
}

test('SQLite preserves imported records across storage instances and deduplicates sync', () => {
  const { db, sql, store } = storage()
  try {
    const state = store.read()
    const source = snapshot()
    const project = importProject(state, source, assignment)
    assert.equal(state.candidates.length, 1)
    assert.equal(state.candidates[0].email, 'one@example.com')
    assert.throws(() => importProject(state, source, assignment), /already imported/)
    assert.equal(syncCandidates(state, project, source), 0)
    source.candidates[1].stage = 'shortlisted'
    assert.equal(syncCandidates(state, project, source), 1)
    const candidate = state.candidates[0]
    transition(state, candidate, hr, CandidateTransitionSchema.parse({ action: 'mark_contact_successful', occurredAt: new Date().toISOString(), notes: 'Contacted' }))
    syncCandidates(state, project, source)
    assert.equal(candidate.status, 'scheduled')
    assert.equal(candidate.activity.length, 2)
    store.write(state)
    assert.deepEqual(new WorkspaceStorage(sql).read(), state)
  } finally { db.close() }
})

test('shared permissions protect notes, project comments, and workflow transitions', () => {
  const { db, store } = storage()
  try {
    const state = store.read()
    const project = importProject(state, snapshot(), assignment)
    const candidate = state.candidates[0]
    assert.throws(() => saveComment(project, 'pre_interview', hr, 'HR comment'), /requires/)
    saveComment(project, 'pre_interview', hm, 'Manager guidance')
    assert.equal(project.stageComments?.[0].body, 'Manager guidance')
    saveNote(candidate, hr, { visibility: 'all', fields: [{ question: 'Private', answer: 'Private answer', visibility: 'human_resource_only' }, { question: 'Shared', answer: 'Shared answer', visibility: 'all' }] })
    assert.equal(candidateResponse(candidate, hm).notes[0].fields?.length, 1)
    assert.equal(candidateResponse(candidate, hr).notes[0].fields?.length, 2)
    assert.throws(() => transition(state, candidate, hm, CandidateTransitionSchema.parse({ action: 'mark_not_reached', occurredAt: new Date().toISOString() })), /role/)
    assert.equal(candidate.status, 'waiting_for_contact')
    const originalId = candidate.notes[0].id
    saveNote(candidate, hm, { visibility: 'all', body: 'Manager note' })
    saveNote(candidate, hr, { visibility: 'all', body: 'Updated note' })
    assert.equal(candidate.notes.length, 2)
    assert.equal(candidate.notes.find(note => note.author.id === hr.id)?.id, originalId)
    assert.equal(candidate.notes.find(note => note.author.id === hr.id)?.body, 'Updated note')
    assert.equal(candidate.notes.find(note => note.author.id === hm.id)?.body, 'Manager note')
  } finally { db.close() }
})

test('only one candidate can be hired per project', () => {
  const { db, store } = storage()
  try {
    const state = store.read()
    const source = snapshot()
    source.candidates[1].stage = 'shortlisted'
    const project = importProject(state, source, assignment)
    for (const candidate of state.candidates) { candidate.stage = 'offer_stage'; candidate.status = 'offer_sent' }
    transition(state, state.candidates[0], hr, { action: 'offer_accepted' })
    assert.equal(project.status, 'closed')
    assert.throws(() => transition(state, state.candidates[1], hr, { action: 'offer_accepted' }), /already has a hire/)
    assert.equal(state.candidates[1].status, 'offer_sent')
  } finally { db.close() }
})
