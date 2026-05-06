import type { Candidate, CandidateFilters } from '../../domain/types'
import type { CandidateTrackerRepository } from '../repositories/candidateTrackerRepository'
import { mockCandidates, mockProjects } from './mockData'

const delay = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 120))

function normalizeCandidates(candidates: Candidate[]) {
  const acceptedProjects = new Set(
    candidates
      .filter((candidate) => candidate.status === 'offer_accepted')
      .map((candidate) => candidate.projectId),
  )

  return candidates.map((candidate) => {
    if (!acceptedProjects.has(candidate.projectId) || candidate.status !== 'waitlisted') return candidate

    const hasProceededStep = candidate.activity.some((item) => item.title === 'Proceeded with another candidate.')
    const nextIndex = String(candidate.activity.length + 1).padStart(2, '0')

    return {
      ...candidate,
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
