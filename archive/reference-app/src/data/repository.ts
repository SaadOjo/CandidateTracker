import { mockCandidateTrackerRepository } from './mock/mockCandidateTrackerRepository'
import type { CandidateTrackerRepository } from './repositories/candidateTrackerRepository'

// Single data access seam for the prototype. Replace this export with an API-backed
// implementation when the backend is ready; UI code should not import mock data directly.
export const candidateTrackerRepository: CandidateTrackerRepository = mockCandidateTrackerRepository
