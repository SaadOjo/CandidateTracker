import { useQuery } from '@tanstack/react-query'
import { listUsers } from '../../data/api'

export function useUsers(currentUserId: string) {
  return useQuery({
    queryKey: ['users', currentUserId],
    queryFn: () => listUsers(),
  })
}
