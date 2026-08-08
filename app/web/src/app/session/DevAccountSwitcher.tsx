import { useState } from 'react'
import { ErrorMessage } from '../../components/feedback/ErrorMessage'
import { userRoleLabels } from '../../domain/labels'
import { useUsers } from '../queries/useUsers'

export function DevAccountSwitcher({
  currentUserId,
  onAccountChange,
}: {
  currentUserId: string
  onAccountChange: (userId: string) => Promise<void>
}) {
  const usersQuery = useUsers(currentUserId)
  const [loading, setLoading] = useState(false)

  async function switchAccount(userId: string) {
    setLoading(true)
    try {
      await onAccountChange(userId)
    } finally {
      setLoading(false)
    }
  }

  if (usersQuery.isPending) return <span role="status">Loading development accounts</span>
  if (usersQuery.isError) return <ErrorMessage message={`Could not load development accounts: ${usersQuery.error.message}`} />
  if (usersQuery.data.length === 0) return <ErrorMessage message="No development accounts were returned" />
  if (!usersQuery.data.some((user) => user.id === currentUserId)) {
    return <ErrorMessage message={`Current development account ${currentUserId} is not in the account list`} />
  }

  return (
    <label className="flex items-center gap-2">
      <span className="text-[11px] font-extrabold text-muted uppercase">Dev account</span>
      <select
        className="h-[34px] max-w-[230px] rounded-lg border border-border bg-surface-subtle px-2.5 text-xs font-bold text-ink outline-0"
        disabled={loading}
        value={currentUserId}
        onChange={(event) => void switchAccount(event.target.value)}
      >
        {usersQuery.data.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} · {userRoleLabels[user.role]}
          </option>
        ))}
      </select>
    </label>
  )
}
