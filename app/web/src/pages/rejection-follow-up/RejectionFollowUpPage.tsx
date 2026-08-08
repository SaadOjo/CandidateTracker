import { useMemo, useState } from 'react'
import { useProjects } from '../../app/queries/useProjects'
import { useRejectionFollowUps } from '../../app/queries/useRejectionFollowUps'
import { ErrorMessage } from '../../components/feedback/ErrorMessage'
import { LoadingState } from '../../components/feedback/LoadingState'
import type { AuthSession, RejectionFollowUp } from '../../domain/types'
import { RejectionFilters } from './components/RejectionFilters'
import { RejectionFollowUpTable } from './components/RejectionFollowUpTable'
import { filterRejectionFollowUps } from './rejectionFollowUpHelpers'
import type { RejectionStatusFilter } from './rejectionFollowUpHelpers'

const emptyFollowUps: RejectionFollowUp[] = []

export function RejectionFollowUpPage({ session }: { session: AuthSession }) {
  const followUpsQuery = useRejectionFollowUps(session.userId)
  const projectsQuery = useProjects(session.userId)
  const followUps = followUpsQuery.data ?? emptyFollowUps
  const projects = projectsQuery.data ?? []
  const [query, setQuery] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<RejectionStatusFilter>('all')
  const [projectMenuOpen, setProjectMenuOpen] = useState(false)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const loading = followUpsQuery.isPending || projectsQuery.isPending
  const error = followUpsQuery.isError
    ? followUpsQuery.error.message
    : projectsQuery.isError ? projectsQuery.error.message : null

  const visibleFollowUps = useMemo(
    () => filterRejectionFollowUps(followUps, query, projectFilter, statusFilter),
    [followUps, projectFilter, query, statusFilter],
  )

  return (
    <div className="pt-12">
      <h1 className="mt-0 mb-[74px] ml-5 font-display text-4xl leading-[43px] font-extrabold tracking-[-2px] text-heading max-[760px]:mb-10 max-[760px]:ml-3">
        Rejection Follow-Up
      </h1>

      <RejectionFilters
        query={query}
        projectFilter={projectFilter}
        statusFilter={statusFilter}
        projects={projects}
        projectMenuOpen={projectMenuOpen}
        statusMenuOpen={statusMenuOpen}
        onQueryChange={setQuery}
        onProjectFilterChange={(value) => {
          setProjectFilter(value)
          setProjectMenuOpen(false)
        }}
        onStatusFilterChange={(value) => {
          setStatusFilter(value)
          setStatusMenuOpen(false)
        }}
        onToggleProjectMenu={() => {
          setProjectMenuOpen((open) => !open)
          setStatusMenuOpen(false)
        }}
        onToggleStatusMenu={() => {
          setStatusMenuOpen((open) => !open)
          setProjectMenuOpen(false)
        }}
      />

      {loading ? (
        <section className="m-5 rounded-lg border border-border bg-white p-[26px]">
          <LoadingState label="Loading rejection follow-ups" />
        </section>
      ) : error ? (
        <section className="m-5 rounded-lg border border-danger-border bg-white p-[26px]">
          <ErrorMessage message={error} />
        </section>
      ) : (
        <RejectionFollowUpTable rows={visibleFollowUps} total={followUps.length} />
      )}
    </div>
  )
}
