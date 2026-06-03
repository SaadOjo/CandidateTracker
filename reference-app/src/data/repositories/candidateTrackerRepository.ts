import type { Candidate, CandidateFilters, Project } from '../../domain/types'

export interface CandidateTrackerRepository {
  listProjects(): Promise<Project[]>
  getProject(projectId: string): Promise<Project | undefined>
  listCandidates(filters?: CandidateFilters): Promise<Candidate[]>
  getCandidate(candidateId: string): Promise<Candidate | undefined>
}
