import { useQuery } from '@tanstack/react-query'
import { getCurrentSession, setDevAuthUserId } from '../../data/api'

export function currentSessionQueryKey(search: string) {
  return ['current-session', new URLSearchParams(search).get('devUserId')] as const
}

export function useCurrentSession(search: string) {
  const queryKey = currentSessionQueryKey(search)

  return useQuery({
    queryKey,
    queryFn: async () => {
      const devUserId = queryKey[1]
      if (devUserId) setDevAuthUserId(devUserId)
      return getCurrentSession()
    },
  })
}
