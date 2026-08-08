import type { RejectionFollowUp } from '../../domain/types'

export type RejectionStatusFilter = 'all' | 'waiting_for_contact' | 'handled'

export function getRejectionDisplayStatus(followUp: RejectionFollowUp): Exclude<RejectionStatusFilter, 'all'> {
  return followUp.status === 'handled' ? 'handled' : 'waiting_for_contact'
}

export function filterRejectionFollowUps(
  followUps: RejectionFollowUp[],
  query: string,
  projectFilter: string,
  statusFilter: RejectionStatusFilter,
) {
  const normalizedQuery = query.trim().toLowerCase()

  return followUps
    .filter((followUp) => {
      if (normalizedQuery && !followUp.candidate.name.toLowerCase().includes(normalizedQuery)) return false
      if (projectFilter !== 'all' && followUp.projectId !== projectFilter) return false
      if (statusFilter !== 'all' && getRejectionDisplayStatus(followUp) !== statusFilter) return false
      return true
    })
    .sort((left, right) => {
      const statusDifference = getStatusPriority(left) - getStatusPriority(right)
      return statusDifference || new Date(left.eligibleAt).getTime() - new Date(right.eligibleAt).getTime()
    })
}

export function formatEligibleDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date).replaceAll('/', '.')
}

function getStatusPriority(followUp: RejectionFollowUp) {
  return getRejectionDisplayStatus(followUp) === 'waiting_for_contact' ? 0 : 1
}
