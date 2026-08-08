import { useQuery } from '@tanstack/react-query'
import { getCandidate } from '../../data/api'

export function candidateQueryKey(currentUserId: string, candidateId: string) {
  return ['candidates', currentUserId, 'detail', candidateId] as const
}

export function useCandidate(currentUserId: string, candidateId: string, enabled = true) {
  return useQuery({
    queryKey: candidateQueryKey(currentUserId, candidateId),
    queryFn: () => {
      if (!candidateId) throw new Error('A candidate ID is required to load a candidate')
      return getCandidate(candidateId)
    },
    enabled: enabled && Boolean(candidateId),
  })
}
