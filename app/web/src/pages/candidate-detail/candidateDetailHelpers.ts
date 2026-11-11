import type {
  Candidate,
  CandidateActivityEvent,
  CandidateNote,
  CandidateNoteInput,
  CandidateTransitionAction,
  NoteField,
  UserRole,
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

export function usesStructuredNote(role: 'human_resource' | 'hiring_manager', candidate: Candidate, existingNote?: CandidateNote) {
  return existingNote ? Boolean(existingNote.fields?.length) : role === 'human_resource' && (candidate.stage === 'hr_interview' || candidate.stage === 'pre_interview')
}

export function buildNoteInput(role: 'human_resource' | 'hiring_manager', candidate: Candidate, textNote: string, formNote: Record<string, string>, existingNote?: CandidateNote): CandidateNoteInput | null {
  if (usesStructuredNote(role, candidate, existingNote)) {
    const fields = buildHrRubricFields(formNote)
    if (fields.length === 0) return null
    return {
      fields: fields.map((field) => ({ ...field, visibility: existingNote?.fields?.find((saved) => saved.question === field.question)?.visibility ?? field.visibility })),
      ...(existingNote?.body ? { body: existingNote.body } : {}),
      visibility: existingNote?.visibility ?? 'all',
    }
  }

  if (!textNote.trim()) return null
  return {
    body: textNote.trim(),
    visibility: existingNote?.visibility ?? 'all',
  }
}

export function hasNoteDraftContent(role: 'human_resource' | 'hiring_manager', candidate: Candidate, textNote: string, formNote: Record<string, string>, existingNote?: CandidateNote) {
  if (usesStructuredNote(role, candidate, existingNote)) {
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
  const rating = hrRubricRatings.find((item) => item.value === value)
  if (!rating) throw new Error(`Unsupported HR rubric rating: ${value}`)
  return rating.label
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
  const rating = hrRubricRatings.find((item) => item.label === label || item.value === label)
  if (!rating) throw new Error(`Unsupported saved HR rubric rating: ${label}`)
  return rating.value
}

export function groupNotesByRole(notes: CandidateNote[]) {
  notes.forEach((note) => {
    if (note.authorRole !== 'human_resource' && note.authorRole !== 'hiring_manager') {
      throw new Error(`Unsupported author role for candidate note ${note.id}: ${String(note.authorRole)}`)
    }
  })

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
  if (candidate.stage === 'department_interview' || candidate.stage === 'hr_interview') {
    return ['scheduled', 'not_reached', 'withdrawn']
  }
  throw new Error(`Contact attempts are not supported for candidate stage: ${candidate.stage}`)
}

export function getContactResultLabel(result: ContactLogResult) {
  if (result === 'contact_successful') return 'Contact Successful'
  if (result === 'scheduled') return 'Scheduled'
  if (result === 'not_reached') return 'Not Reached'
  if (result === 'withdrawn') return 'Withdrawn'
  throw new Error(`Unsupported contact result: ${String(result)}`)
}

export function getContactTransitionAction(candidate: Candidate, result: ContactLogResult): CandidateTransitionAction {
  if (result === 'scheduled') {
    if (candidate.stage === 'department_interview') return 'schedule_department_interview'
    if (candidate.stage === 'hr_interview') return 'schedule_hr_interview'
    throw new Error(`Scheduled contact result is not supported for candidate stage: ${candidate.stage}`)
  }
  if (result === 'not_reached') return 'mark_not_reached'
  if (result === 'withdrawn') return 'withdraw'
  if (result === 'contact_successful') {
    if (candidate.stage === 'pre_interview') return 'mark_contact_successful'
    throw new Error(`Successful contact result is not supported for candidate stage: ${candidate.stage}`)
  }
  throw new Error(`Unsupported contact result: ${String(result)}`)
}

export function shouldShowProcess(candidate: Candidate, role: 'human_resource' | 'hiring_manager') {
  if (candidate.stage === 'pre_interview') return candidate.status === 'scheduled'
  if (candidate.stage === 'department_interview') return role === 'hiring_manager' && candidate.status === 'scheduled'
  if (candidate.stage === 'hr_interview') return role === 'human_resource' && candidate.status !== 'rejected' && candidate.status !== 'withdrawn'
  if (candidate.stage === 'manager_review') return role === 'human_resource' || role === 'hiring_manager'
  return false
}

export function formatNoteAuthor(note: CandidateNote) {
  if (!note.author) throw new Error(`Candidate note ${note.id} has no author`)
  if (!note.author.name.trim()) throw new Error(`Candidate note ${note.id} has an empty author name`)
  return `${formatAuthorRole(note.authorRole)} · ${note.author.name}`
}

function formatAuthorRole(role: CandidateNote['authorRole']) {
  if (role === 'hiring_manager') return 'Hiring Manager'
  if (role === 'human_resource') return 'Human Resource'
  throw new Error(`Unsupported candidate note author role: ${String(role)}`)
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

export function getActivitySubtext(item: CandidateActivityEvent) {
  const subtitle = item.subtitle?.trim()
  if (subtitle && !redundantActivitySubtitles.has(subtitle)) return subtitle

  if (!item.actor) return ''
  const actor = getActivityActorLabel(item)

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

function getActivityActorLabel(item: CandidateActivityEvent) {
  if (!item.actor) throw new Error(`Candidate activity ${item.id} has no actor`)
  if (!item.actor.name.trim()) throw new Error(`Candidate activity ${item.id} has an empty actor name`)
  return `${formatUserRole(item.actor.role)} - ${item.actor.name}`
}

function formatUserRole(role: UserRole) {
  if (role === 'hiring_manager') return 'Hiring Manager'
  if (role === 'human_resource') return 'Human Resource'
  if (role === 'admin') return 'Admin'
  throw new Error(`Unsupported user role: ${String(role)}`)
}

export function formatSource(source: Candidate['source']) {
  if (source === 'linkedin') return 'LinkedIn'
  if (source === 'referral') return 'Referral'
  if (source === 'manual') return 'Manual'
  throw new Error(`Unsupported candidate source: ${String(source)}`)
}

export function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid candidate date and time: ${value}`)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

export function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid candidate time: ${value}`)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date)
}

export function defaultInterviewDate() {
  const date = new Date()
  date.setDate(date.getDate() + 2)
  date.setHours(10, 0, 0, 0)
  return date
}

export function defaultContactDate(now = new Date()) {
  const date = new Date(now)
  date.setMinutes(Math.floor(date.getMinutes() / 15) * 15, 0, 0)
  return date
}

export function isQuarterHourDateTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):(00|15|30|45)$/.test(value)) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && toDateTimeLocalValue(date) === value
}

export function toDateTimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}
