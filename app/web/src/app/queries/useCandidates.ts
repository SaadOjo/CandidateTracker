import { useQuery } from '@tanstack/react-query'
import { listCandidates } from '../../data/api'
import type { CandidateFilters } from '../../domain/types'

export function candidatesQueryKey(currentUserId: string, filters: CandidateFilters = {}) {
  return ['candidates', currentUserId, 'list', normalizeCandidateFilters(filters)] as const
}

export function useCandidates(currentUserId: string, filters: CandidateFilters = {}, enabled = true) {
  const normalizedFilters = normalizeCandidateFilters(filters)

  return useQuery({
    queryKey: candidatesQueryKey(currentUserId, normalizedFilters),
    queryFn: () => listCandidates(normalizedFilters),
    enabled,
  })
}

function normalizeCandidateFilters(filters: CandidateFilters) {
  return {
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.stage ? { stage: filters.stage } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.query?.trim() ? { query: filters.query.trim() } : {}),
  }
}
