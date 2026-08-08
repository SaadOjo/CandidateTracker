import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getCurrentSession, setDevAuthUserId } from '../data/api'
import { AppRoutes } from './AppRoutes'
import { AppLayout, shellClasses } from './layout/AppLayout'
import { currentSessionQueryKey, useCurrentSession } from './queries/useCurrentSession'

const centeredPanelClasses = 'rounded-lg border border-border bg-white p-[26px]'
const eyebrowClasses = 'm-0 text-[11px] font-extrabold tracking-[0.08em] text-muted uppercase'

export function App() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const sessionQuery = useCurrentSession(location.search)
  const [accountSwitching, setAccountSwitching] = useState(false)
  const [accountSwitchError, setAccountSwitchError] = useState<string | null>(null)

  async function handleAccountChange(userId: string) {
    setAccountSwitching(true)
    setAccountSwitchError(null)
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== 'current-session',
    })
    setDevAuthUserId(userId)

    try {
      const session = await getCurrentSession()
      const activeSessionKey = currentSessionQueryKey(location.search)
      queryClient.setQueryData(activeSessionKey, session)
      queryClient.removeQueries({
        predicate: (query) =>
          query.queryKey[0] !== activeSessionKey[0] || query.queryKey[1] !== activeSessionKey[1],
      })
    } catch (error) {
      queryClient.clear()
      setAccountSwitchError(error instanceof Error ? error.message : 'Could not change current user')
    } finally {
      setAccountSwitching(false)
    }
  }

  const sessionError = accountSwitchError ?? (sessionQuery.isError ? sessionQuery.error.message : null)

  if (sessionError) {
    return (
      <div className={`${shellClasses} place-items-center p-6`}>
        <section className={centeredPanelClasses}>
          <p className={eyebrowClasses}>Authentication</p>
          <h1>Unable to load current user</h1>
          <p className="m-0 flex items-center gap-2 font-bold text-danger">{sessionError}</p>
        </section>
      </div>
    )
  }

  if (sessionQuery.isPending || accountSwitching) {
    return (
      <div className={`${shellClasses} place-items-center p-6`}>
        <section className={centeredPanelClasses}>
          <p className={eyebrowClasses}>Candidate Tracker</p>
          <h1>{accountSwitching ? 'Switching account' : 'Loading account'}</h1>
        </section>
      </div>
    )
  }

  const session = sessionQuery.data
  if (!session) throw new Error('Current session query completed without session data')

  return (
    <AppLayout session={session} onAccountChange={handleAccountChange}>
      <AppRoutes key={session.userId} session={session} />
    </AppLayout>
  )
}
