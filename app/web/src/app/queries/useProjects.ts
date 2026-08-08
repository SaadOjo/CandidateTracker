import { useQuery } from '@tanstack/react-query'
import { listProjects } from '../../data/api'
import type { ProjectStatus } from '../../domain/types'

export interface ProjectQueryFilters {
  status?: ProjectStatus
  query?: string
}

export function projectsQueryKey(currentUserId: string, filters: ProjectQueryFilters = {}) {
  return ['projects', currentUserId, 'list', normalizeProjectFilters(filters)] as const
}

export function useProjects(currentUserId: string, filters: ProjectQueryFilters = {}) {
  const normalizedFilters = normalizeProjectFilters(filters)

  return useQuery({
    queryKey: projectsQueryKey(currentUserId, normalizedFilters),
    queryFn: () => listProjects(normalizedFilters),
  })
}

function normalizeProjectFilters(filters: ProjectQueryFilters) {
  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.query?.trim() ? { query: filters.query.trim() } : {}),
  }
}
