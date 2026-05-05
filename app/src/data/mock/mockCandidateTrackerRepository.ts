import type { CandidateFilters } from '../../domain/types'
import type { CandidateTrackerRepository } from '../repositories/candidateTrackerRepository'
import { mockCandidates, mockProjects } from './mockData'

const delay = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 120))

export const mockCandidateTrackerRepository: CandidateTrackerRepository = {
  listProjects: () => delay(mockProjects),

  getProject: (projectId) => delay(mockProjects.find((project) => project.id === projectId)),

  listCandidates: (filters: CandidateFilters = {}) => {
    const query = filters.query?.trim().toLowerCase()
    const candidates = mockCandidates.filter((candidate) => {
      if (filters.projectId && candidate.projectId !== filters.projectId) return false
      if (filters.stage && candidate.stage !== filters.stage) return false
      if (filters.status && candidate.status !== filters.status) return false
      if (query && !candidate.name.toLowerCase().includes(query)) return false
      return true
    })

    return delay(candidates)
  },

  getCandidate: (candidateId) => delay(mockCandidates.find((candidate) => candidate.id === candidateId)),
}
