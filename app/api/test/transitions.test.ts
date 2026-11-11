import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CandidateTransitionSchema } from '../src/domain.js'
import { assertTransitionAllowed } from '../src/features/candidates/transition-policy.js'

test('department outcomes belong to the hiring manager after scheduling', () => {
  const state = { stage: 'department_interview', status: 'scheduled' } as const
  assert.doesNotThrow(() => assertTransitionAllowed(state, 'move_to_hr_interview', 'hiring_manager'))
  assert.throws(() => assertTransitionAllowed(state, 'move_to_hr_interview', 'human_resource'), /role/)
  assert.throws(() => assertTransitionAllowed({ ...state, status: 'waiting_for_contact' }, 'move_to_hr_interview', 'hiring_manager'), /stage and status/)
})

test('candidate review can be processed by both roles', () => {
  for (const role of ['human_resource', 'hiring_manager'] as const) {
    assert.doesNotThrow(() => assertTransitionAllowed({ stage: 'manager_review', status: 'waitlisted' }, 'approve_for_offer', role))
  }
})

test('terminal candidates cannot be moved or contacted again', () => {
  for (const status of ['withdrawn', 'rejected', 'offer_rejected', 'offer_accepted', 'proceeded_with_another_candidate'] as const) {
    assert.throws(() => assertTransitionAllowed({ stage: 'pre_interview', status }, 'mark_not_reached', 'human_resource'), /no longer active/)
  }
})

test('offers cannot be accepted before being sent', () => {
  assert.throws(() => assertTransitionAllowed({ stage: 'offer_stage', status: 'approved_for_offer' }, 'offer_accepted', 'human_resource'))
  assert.doesNotThrow(() => assertTransitionAllowed({ stage: 'offer_stage', status: 'offer_sent' }, 'offer_accepted', 'human_resource'))
})

test('scheduling requires explicit contact time, interview time and a meeting link', () => {
  const input = { action: 'schedule_department_interview', occurredAt: '2026-11-11T10:00:00Z', interviewStartAt: '2026-11-12T10:00:00Z', meetingUrl: 'https://meet.example.test/interview' }
  assert.equal(CandidateTransitionSchema.safeParse(input).success, true)
  for (const key of ['occurredAt', 'interviewStartAt', 'meetingUrl']) {
    assert.equal(CandidateTransitionSchema.safeParse({ ...input, [key]: undefined }).success, false)
  }
  assert.equal(CandidateTransitionSchema.safeParse({ ...input, meetingUrl: '   ' }).success, false)
})

test('both interview stages accept meeting links without an HTTP prefix and preserve them', () => {
  for (const action of ['schedule_department_interview', 'schedule_hr_interview']) {
    for (const meetingUrl of ['meet.google.com/abc-defg-hij', 'www.example.com/meeting', 'zoommtg://zoom.us/join?confno=123456789', 'http://example.com/meeting', 'https://example.com/meeting']) {
      const parsed = CandidateTransitionSchema.parse({ action, occurredAt: '2026-11-11T10:00:00Z', interviewStartAt: '2026-11-12T10:00:00Z', meetingUrl: ` ${meetingUrl} ` })
      assert.equal(parsed.meetingUrl, meetingUrl)
    }
  }
})
