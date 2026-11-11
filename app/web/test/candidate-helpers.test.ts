import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getActivitySubtext, getContactTransitionAction, buildNoteInput, defaultContactDate, isQuarterHourDateTime, toDateTimeLocalValue } from '../src/pages/candidate-detail/candidateDetailHelpers'
import type { Candidate, CandidateNote } from '../src/domain/types'

test('system import activity preserves its source without inventing an actor', () => {
  assert.equal(getActivitySubtext({ id: 'event', title: 'Profile Imported', subtitle: 'Source: LinkedIn', occurredAt: '2026-11-11T10:00:00Z', actor: null }), 'Source: LinkedIn')
})

test('movement subtext attributes the action without repeating the movement', () => {
  const text = getActivitySubtext({ id: 'event', title: 'Moved to HR Interview Stage', subtitle: 'Candidate moved from Department Interview to HR Interview.', occurredAt: '2026-11-11T10:00:00Z', actor: { id: 'user', name: 'Alex', role: 'hiring_manager' } })
  assert.equal(text, 'Moved by Hiring Manager - Alex')
})

test('interview scheduling maps to the current interview stage only', () => {
  assert.equal(getContactTransitionAction({ stage: 'hr_interview' } as Candidate, 'scheduled'), 'schedule_hr_interview')
  assert.throws(() => getContactTransitionAction({ stage: 'pre_interview' } as Candidate, 'scheduled'))
})

test('blank HR rubric is rejected; supplied comments remain editable data', () => {
  const candidate = { stage: 'pre_interview' } as Candidate
  assert.equal(buildNoteInput('human_resource', candidate, '', {}), null)
  assert.deepEqual(buildNoteInput('human_resource', candidate, '', { 'Culture fit comments': 'Clear examples' }), { visibility: 'all', fields: [{ question: 'Culture fit comments', answer: 'Clear examples', visibility: 'all' }] })
})

test('editing preserves note format and visibility after the candidate changes stages', () => {
  const textNote = { body: 'Original', fields: null, visibility: 'human_resource_only' } as CandidateNote
  assert.deepEqual(buildNoteInput('human_resource', { stage: 'hr_interview' } as Candidate, ' Updated ', {}, textNote), { body: 'Updated', visibility: 'human_resource_only' })
  const structuredNote = { body: null, visibility: 'all', fields: [{ question: 'Culture fit comments', answer: 'Original', visibility: 'human_resource_only' }] } as CandidateNote
  assert.deepEqual(buildNoteInput('human_resource', { stage: 'department_interview' } as Candidate, '', { 'Culture fit comments': 'Updated' }, structuredNote), { visibility: 'all', fields: [{ question: 'Culture fit comments', answer: 'Updated', visibility: 'human_resource_only' }] })
})

test('default contact time uses the previous local quarter-hour without changing the source date', () => {
  for (const [input, expected] of [
    ['2026-11-11T00:07:59', '2026-11-11T00:00'],
    ['2026-11-11T10:15:00', '2026-11-11T10:15'],
    ['2026-11-11T10:29:59', '2026-11-11T10:15'],
    ['2026-11-11T23:59:59', '2026-11-11T23:45'],
  ]) {
    const now = new Date(input)
    const original = now.getTime()
    const rounded = defaultContactDate(now)
    assert.equal(toDateTimeLocalValue(rounded), expected)
    assert.equal(rounded.getSeconds(), 0)
    assert.equal(rounded.getMilliseconds(), 0)
    assert.equal(now.getTime(), original)
  }
})

test('date/time input accepts quarter-hours and rejects missing dates, other minutes, seconds and impossible dates', () => {
  for (const minute of ['00', '15', '30', '45']) {
    assert.equal(isQuarterHourDateTime(`2026-11-11T09:${minute}`), true)
  }
  for (const value of ['', 'T09:15', '2026-11-11T09:16', '2026-11-11T09:15:30', '2026-11-11T24:00', '2026-02-30T09:15']) {
    assert.equal(isQuarterHourDateTime(value), false, value)
  }
})
