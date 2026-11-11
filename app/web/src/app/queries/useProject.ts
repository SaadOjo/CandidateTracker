import { useQuery } from '@tanstack/react-query'
import { getProject } from '../../data/api'

export function projectQueryKey(currentUserId: string, projectId: string) {
  return ['projects', currentUserId, 'detail', projectId] as const
}

export function useProject(currentUserId: string, projectId: string, enabled = true) {
  return useQuery({
    queryKey: projectQueryKey(currentUserId, projectId),
    queryFn: ({ signal }) => {
      if (!projectId) throw new Error('A project ID is required to load a project')
      return getProject(projectId, signal)
    },
    enabled: enabled && Boolean(projectId),
    refetchInterval: (query) => query.state.data?.simulatorTracking ? 5000 : false,
  })
}
