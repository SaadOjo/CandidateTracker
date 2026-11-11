import type { QueryClient } from '@tanstack/react-query'

export async function invalidateWorkflow(queryClient: QueryClient, userId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['candidates', userId] }),
    queryClient.invalidateQueries({ queryKey: ['projects', userId] }),
    queryClient.invalidateQueries({ queryKey: ['rejection-follow-ups', userId] }),
  ])
}
