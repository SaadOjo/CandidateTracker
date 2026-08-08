import type {
  Candidate,
  CandidateActivityEvent,
  CandidateNote,
  CandidateNoteInput,
  CandidateTransitionAction,
  NoteField,
  Project,
} from '../../domain/types'

export const hrRubricItems = [
  'Culture fit',
  'Presence and representation',
  'Motivation',
] as const

export const hrRubricTextFields = [
  'Candidate strengths',
  'Development areas',
  'General HR findings',
] as const

export const hrRubricRatings = [
  { value: 'below_expectation', label: 'Below expectation' },
  { value: 'expected_level', label: 'Expected level' },
  { value: 'above_expectation', label: 'Above expectation' },
] as const

export function buildNoteInput(role: 'human_resource' | 'hiring_manager', candidate: Candidate, textNote: string, formNote: Record<string, string>): CandidateNoteInput | null {
  if (role === 'human_resource' && (candidate.stage === 'hr_interview' || candidate.stage === 'pre_interview')) {
    const fields = buildHrRubricFields(formNote)
    if (fields.length === 0) return null
    return {
      fields,
      visibility: 'all',
    }
  }

  if (!textNote.trim()) return null
  return {
    body: textNote.trim(),
    visibility: 'all',
  }
}

export function hasNoteDraftContent(role: 'human_resource' | 'hiring_manager', candidate: Candidate, textNote: string, formNote: Record<string, string>) {
  if (role === 'human_resource' && (candidate.stage === 'hr_interview' || candidate.stage === 'pre_interview')) {
    return buildHrRubricFields(formNote).length > 0
  }

  return Boolean(textNote.trim())
}

function buildHrRubricFields(formNote: Record<string, string>): NoteField[] {
  const fields: NoteField[] = []

  hrRubricItems.forEach((item) => {
    const rating = formNote[`${item} rating`]?.trim()
    const comments = formNote[`${item} comments`]?.trim()

    if (rating) {
      fields.push({
        question: `${item} rating`,
        answer: formatHrRubricRating(rating),
        visibility: 'all',
      })
    }

    if (comments) {
      fields.push({
        question: `${item} comments`,
        answer: comments,
        visibility: 'all',
      })
    }
  })

  hrRubricTextFields.forEach((field) => {
    const answer = formNote[field]?.trim()
    if (!answer) return
    fields.push({
      question: field,
      answer,
      visibility: 'all',
    })
  })

  return fields
}

function formatHrRubricRating(value: string) {
  return hrRubricRatings.find((rating) => rating.value === value)?.label ?? value
}

export function noteFieldsToForm(note: CandidateNote) {
  const values: Record<string, string> = {}

  ;(note.fields ?? []).forEach((field) => {
    values[field.question] = field.question.endsWith(' rating')
      ? parseHrRubricRating(field.answer)
      : field.answer
  })

  return values
}

function parseHrRubricRating(label: string) {
  return hrRubricRatings.find((rating) => rating.label === label || rating.value === label)?.value ?? label
}

export function groupNotesByRole(notes: CandidateNote[]) {
  const groups = [
    {
      role: 'human_resource',
      label: 'Human Resource',
      notes: notes.filter((note) => note.authorRole === 'human_resource'),
    },
    {
      role: 'hiring_manager',
      label: 'Hiring Manager',
      notes: notes.filter((note) => note.authorRole === 'hiring_manager'),
    },
  ]

  return groups.filter((group) => group.notes.length > 0)
}

export function getProcessActions(candidate: Candidate, role: 'human_resource' | 'hiring_manager'): Array<{ label: string; action: CandidateTransitionAction }> {
  if (candidate.stage === 'pre_interview') return [{ label: 'Move to Department Interview Stage', action: 'move_to_department_interview' }]
  if (candidate.stage === 'department_interview' && role === 'hiring_manager') return [{ label: 'Move to HR Stage', action: 'move_to_hr_interview' }]
  if (candidate.stage === 'hr_interview') {
    return candidate.status === 'assessment_sent'
      ? [{ label: 'Move to Candidate Review', action: 'move_to_candidate_review' }]
      : [{ label: 'Send Assessment', action: 'send_assessment' }]
  }
  if (candidate.stage === 'manager_review') {
    return [
      { label: 'Approve for Offer', action: 'approve_for_offer' },
      { label: 'Waitlist', action: 'waitlist' },
    ]
  }
  return []
}

export type ContactLogResult = 'contact_successful' | 'scheduled' | 'not_reached' | 'withdrawn'

export function getContactResultOptions(candidate: Candidate): ContactLogResult[] {
  if (candidate.stage === 'pre_interview') return ['contact_successful', 'not_reached', 'withdrawn']
  return ['scheduled', 'not_reached', 'withdrawn']
}

export function getContactResultLabel(result: ContactLogResult) {
  if (result === 'contact_successful') return 'Contact Successful'
  if (result === 'scheduled') return 'Scheduled'
  if (result === 'not_reached') return 'Not Reached'
  return 'Withdrawn'
}

export function getContactTransitionAction(candidate: Candidate, result: ContactLogResult): CandidateTransitionAction {
  if (result === 'scheduled') {
    return candidate.stage === 'hr_interview' ? 'schedule_hr_interview' : 'schedule_department_interview'
  }
  if (result === 'not_reached') return 'mark_not_reached'
  if (result === 'withdrawn') return 'withdraw'
  return 'mark_contact_successful'
}

export function shouldShowProcess(candidate: Candidate, role: 'human_resource' | 'hiring_manager') {
  if (candidate.stage === 'pre_interview') return candidate.status === 'scheduled'
  if (candidate.stage === 'department_interview') return role === 'hiring_manager' && candidate.status === 'scheduled'
  if (candidate.stage === 'hr_interview') return role === 'human_resource' && candidate.status !== 'rejected' && candidate.status !== 'withdrawn'
  if (candidate.stage === 'manager_review') return role === 'human_resource' || role === 'hiring_manager'
  return false
}

export function formatNoteAuthor(note: CandidateNote, project: Project | null) {
  if (note.author?.name) return `${formatAuthorRole(note.authorRole)} · ${note.author.name}`
  if (note.authorRole === 'hiring_manager') return `Hiring Manager · ${project?.hiringManager ?? '—'}`
  if (note.authorRole === 'human_resource') return `Human Resource · ${project?.assignedHumanResources?.[0] ?? '—'}`
  return 'Internal Note'
}

function formatAuthorRole(role: CandidateNote['authorRole']) {
  if (role === 'hiring_manager') return 'Hiring Manager'
  if (role === 'human_resource') return 'Human Resource'
  return 'User'
}

const redundantActivitySubtitles = new Set([
  'Assessment sent to candidate.',
  'Candidate added to waitlist.',
  'Candidate approved for offer.',
  'Candidate moved from Department Interview to HR Interview.',
  'Candidate moved from Pre-Interview to Department Interview.',
  'Candidate moved to review.',
  'Candidate rejected from workflow.',
  'Candidate withdrew from the process.',
  'Contact attempt completed.',
  'Department interview scheduled.',
  'Final check sent to candidate.',
  'HR interview scheduled.',
  'Offer accepted by candidate.',
  'Offer sent to candidate.',
])

export function getActivitySubtext(item: CandidateActivityEvent, project: Project | null) {
  const subtitle = item.subtitle?.trim()
  if (subtitle && !redundantActivitySubtitles.has(subtitle)) return subtitle

  const actor = getActivityActorLabel(item, project)
  if (!actor) return ''

  if (item.title.startsWith('Moved to')) return `Moved by ${actor}`
  if (item.title.includes('Scheduled')) return `Scheduled by ${actor}`
  if (item.title === 'Assessment Sent' || item.title === 'Final Check Sent' || item.title === 'Offer Sent') return `Sent by ${actor}`
  if (item.title === 'Approved for Offer') return `Approved by ${actor}`
  if (item.title === 'Candidate Waitlisted') return `Waitlisted by ${actor}`
  if (item.title === 'Candidate Rejected' || item.title === 'Offer Rejected') return `Rejected by ${actor}`
  if (item.title === 'Offer Accepted') return `Accepted by ${actor}`
  if (item.title === 'Pre-Interview Conducted Successfully' || item.title === 'Contact Attempt Logged' || item.title === 'Candidate Withdrawn') return `Logged by ${actor}`

  return ''
}

function getActivityActorLabel(item: CandidateActivityEvent, project: Project | null) {
  if (item.actor?.name) return `${formatUserRole(item.actor.role)} - ${item.actor.name}`
  if (item.actorRole === 'hiring_manager') return `Hiring Manager - ${project?.hiringManager ?? '—'}`
  if (item.actorRole === 'human_resource') return `Human Resource - ${project?.assignedHumanResources?.[0] ?? '—'}`
  if (item.actorRole === 'admin') return 'Admin'
  return ''
}

function formatUserRole(role: string) {
  if (role === 'hiring_manager') return 'Hiring Manager'
  if (role === 'human_resource') return 'Human Resource'
  if (role === 'admin') return 'Admin'
  return role
}

export function notifyCandidateChanged() {
  window.dispatchEvent(new Event('candidate-tracker:candidate-changed'))
}

export function formatSource(source: string) {
  if (source === 'linkedin') return 'LinkedIn'
  return source.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

export function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date)
}

export function defaultInterviewDate() {
  const date = new Date()
  date.setDate(date.getDate() + 2)
  date.setHours(10, 0, 0, 0)
  return date
}

export function toDateTimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}
