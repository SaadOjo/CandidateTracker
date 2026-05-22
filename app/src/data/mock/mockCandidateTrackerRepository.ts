import type { Candidate, CandidateFilters, Note } from '../../domain/types'
import type { CandidateTrackerRepository } from '../repositories/candidateTrackerRepository'
import { mockCandidates, mockProjects } from './mockData'

const delay = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 120))

function buildFallbackPreInterviewNote(candidate: Candidate): Note {
  const project = mockProjects.find((item) => item.id === candidate.projectId)

  return {
    id: `${candidate.id}-pre-interview-note`,
    author: 'HR Manager',
    authorName: project?.assignedHr?.[0] ?? 'Sarah Chen',
    createdAt: 'Apr 08, 2024 • 10:00 AM',
    fields: [
      { question: 'Why is the candidate interested in this role?', answer: `Candidate expressed clear interest in the ${candidate.stage === 'offer_stage' ? 'role and final opportunity' : 'role and team scope'}.` },
      { question: 'How clear and professional was the communication?', answer: 'Pre-interview communication was clear, professional, and easy to follow.' },
      { question: 'What is the expected wage?', answer: 'Expected wage was discussed during screening and stayed inside the approved range.', visibility: 'hr_only' },
      { question: 'Is notice period / availability suitable?', answer: 'Availability looked suitable for the expected process timeline.' },
      { question: 'Did the candidate sound motivated to continue?', answer: 'Candidate sounded motivated and open to continuing in the process.' },
      { question: 'General Notes', answer: 'Pre-interview was conducted successfully and the notes should remain visible in later stages.' },
    ],
  }
}

function hasPreInterviewNote(candidate: Candidate) {
  return candidate.notes.some((note) =>
    note.fields?.some((field) => field.question === 'Did the candidate sound motivated to continue?'),
  )
}

function normalizeCandidates(candidates: Candidate[]) {
  const acceptedProjects = new Set(
    candidates
      .filter((candidate) => candidate.status === 'offer_accepted')
      .map((candidate) => candidate.projectId),
  )
  const projectsWithActiveOffer = new Set(
    candidates
      .filter((candidate) => candidate.status === 'offer_sent' || candidate.status === 'offer_accepted')
      .map((candidate) => candidate.projectId),
  )

  return candidates.map((candidate) => {
    const completedPreInterview = !(candidate.stage === 'pre_interview' && (candidate.status === 'waiting_for_contact' || candidate.status === 'not_reached'))
    const needsPreInterviewNote = completedPreInterview && !hasPreInterviewNote(candidate)
    const normalizedNotes = needsPreInterviewNote
      ? [buildFallbackPreInterviewNote(candidate), ...candidate.notes]
      : candidate.notes

    if (!acceptedProjects.has(candidate.projectId) || candidate.status !== 'waitlisted') {
      const shouldResetFinalCheck = candidate.status === 'final_check_sent' && projectsWithActiveOffer.has(candidate.projectId)

      return {
        ...candidate,
        notes: normalizedNotes,
        status: shouldResetFinalCheck ? 'approved_for_offer' as const : candidate.status,
        activity: shouldResetFinalCheck
          ? candidate.activity.filter((item) => item.title !== 'Final Check Sent')
          : candidate.activity,
      }
    }

    const hasProceededStep = candidate.activity.some((item) => item.title === 'Proceeded with another candidate.')
    const nextIndex = String(candidate.activity.length + 1).padStart(2, '0')

    return {
      ...candidate,
      notes: normalizedNotes,
      status: 'proceeded_with_another_candidate' as const,
      stage: 'offer_stage' as const,
      activity: hasProceededStep
        ? candidate.activity
        : [...candidate.activity, { id: `${candidate.id}-proceeded`, index: nextIndex, title: 'Proceeded with another candidate.', date: 'Apr 21, 2024', tone: 'neutral' as const }],
    }
  })
}

export const mockCandidateTrackerRepository: CandidateTrackerRepository = {
  listProjects: () => delay(mockProjects),

  getProject: (projectId) => delay(mockProjects.find((project) => project.id === projectId)),

  listCandidates: (filters: CandidateFilters = {}) => {
    const query = filters.query?.trim().toLowerCase()
    const candidates = normalizeCandidates(mockCandidates).filter((candidate) => {
      if (filters.projectId && candidate.projectId !== filters.projectId) return false
      if (filters.stage && candidate.stage !== filters.stage) return false
      if (filters.status && candidate.status !== filters.status) return false
      if (query && !candidate.name.toLowerCase().includes(query)) return false
      return true
    })

    return delay(candidates)
  },

  getCandidate: (candidateId) => delay(normalizeCandidates(mockCandidates).find((candidate) => candidate.id === candidateId)),
}
