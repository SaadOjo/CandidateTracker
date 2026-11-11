import { useQuery } from '@tanstack/react-query'
import { listRejectionFollowUps } from '../../data/api'
import type { RejectionFollowUpStatus } from '../../domain/types'

interface RejectionFollowUpFilters {
  projectId?: string
  status?: RejectionFollowUpStatus
  query?: string
}

export function rejectionFollowUpsQueryKey(currentUserId: string, filters: RejectionFollowUpFilters = {}) {
  return ['rejection-follow-ups', currentUserId, 'list', normalizeRejectionFilters(filters)] as const
}

export function useRejectionFollowUps(currentUserId: string, filters: RejectionFollowUpFilters = {}) {
  const normalizedFilters = normalizeRejectionFilters(filters)

  return useQuery({
    queryKey: rejectionFollowUpsQueryKey(currentUserId, normalizedFilters),
    queryFn: ({ signal }) => listRejectionFollowUps(normalizedFilters, signal),
  })
}

function normalizeRejectionFilters(filters: RejectionFollowUpFilters) {
  return {
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.query?.trim() ? { query: filters.query.trim() } : {}),
  }
}
