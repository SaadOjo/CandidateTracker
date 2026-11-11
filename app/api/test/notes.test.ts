import assert from 'node:assert/strict'
import { test } from 'node:test'
import { visibleNotes } from '../src/features/candidates/note-visibility.js'
import { UpsertCandidateNoteSchema } from '../src/domain.js'

const notes = [
  { id: 'private', visibility: 'human_resource_only', fields: null, body: 'Confidential' },
  { id: 'mixed', visibility: 'all', body: null, fields: [
    { question: 'Experience', answer: 'Relevant', visibility: 'all' },
    { question: 'Compensation', answer: 'Confidential', visibility: 'human_resource_only' },
  ] },
]

test('hiring managers never receive private notes or fields', () => {
  const result = visibleNotes(notes, 'hiring_manager')
  assert.equal(result.length, 1)
  assert.equal(result[0].fields?.length, 1)
  assert.doesNotMatch(JSON.stringify(result), /Confidential|Compensation/)
  assert.equal(notes[1].fields?.length, 2)
})

test('human resource and admins retain private fields', () => {
  for (const role of ['human_resource', 'admin'] as const) {
    assert.deepEqual(visibleNotes(notes, role), notes)
  }
})

test('malformed stored fields fail instead of exposing unvalidated fields', () => {
  assert.throws(() => visibleNotes([{ visibility: 'all', fields: [{ question: 'Salary', answer: 'Private', visibility: 'hr_only' }] }], 'hiring_manager'), /Invalid stored note fields/)
})

test('empty notes cannot be saved', () => {
  assert.equal(UpsertCandidateNoteSchema.safeParse({ body: ' ', fields: [] }).success, false)
  assert.equal(UpsertCandidateNoteSchema.safeParse({ body: 'Actual comment' }).success, true)
})
