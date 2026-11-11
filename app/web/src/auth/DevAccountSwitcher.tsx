import { useQuery } from '@tanstack/react-query'
import { ErrorMessage } from '../components/feedback/ErrorMessage'
import { userRoleLabels } from '../domain/labels'
import { listDevelopmentUsers } from './auth'
import { useAuth } from './useAuth'

export function DevAccountSwitcher() {
  const { state, switchError, switchDevelopmentUser } = useAuth()
  const usersQuery = useQuery({
    queryKey: ['auth', 'development-users'],
    queryFn: listDevelopmentUsers,
  })
  const currentSession = state.status === 'authenticated'
    ? state.session
    : state.status === 'switching' ? state.session : null
  const currentUserId = currentSession?.userId ?? null

  if (usersQuery.isPending) return <span role="status">Loading development accounts</span>
  if (usersQuery.isError) return <ErrorMessage message={`Could not load development accounts: ${usersQuery.error.message}`} />
  if (usersQuery.data.length === 0) return <ErrorMessage message="No development accounts were returned" />
  if (currentUserId && !usersQuery.data.some((user) => user.id === currentUserId)) {
    return <ErrorMessage message={`Current development account ${currentUserId} is not in the account list`} />
  }

  return (
    <div className="grid min-w-0 max-w-full gap-1.5">
      <label className="flex min-w-0 items-center gap-2">
        <span className="text-[11px] font-extrabold text-muted uppercase">Dev account</span>
        <select
          className="h-[34px] min-w-0 max-w-[230px] rounded-lg border border-border bg-surface-subtle px-2.5 text-xs font-bold text-ink outline-0"
          disabled={state.status === 'switching'}
          value={currentSession?.email ?? ''}
          onChange={(event) => void switchDevelopmentUser(event.target.value)}
        >
          {!currentSession && <option value="" disabled>Select an account</option>}
          {usersQuery.data.map((user) => (
            <option key={user.id} value={user.email}>
              {user.name} · {userRoleLabels[user.role]}
            </option>
          ))}
        </select>
      </label>
      {switchError && <ErrorMessage message={switchError} />}
    </div>
  )
}
