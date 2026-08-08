import { useEffect, useMemo, useState } from 'react'
import { ErrorMessage } from '../../components/feedback/ErrorMessage'
import { LoadingState } from '../../components/feedback/LoadingState'
import { listProjects, listRejectionFollowUps } from '../../data/api'
import type { Project, RejectionFollowUp } from '../../domain/types'
import { RejectionFilters } from './components/RejectionFilters'
import { RejectionFollowUpTable } from './components/RejectionFollowUpTable'
import { filterRejectionFollowUps } from './rejectionFollowUpHelpers'
import type { RejectionStatusFilter } from './rejectionFollowUpHelpers'

export function RejectionFollowUpPage() {
  const [followUps, setFollowUps] = useState<RejectionFollowUp[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [query, setQuery] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<RejectionStatusFilter>('all')
  const [projectMenuOpen, setProjectMenuOpen] = useState(false)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadFollowUps() {
      try {
        const [followUpItems, projectItems] = await Promise.all([
          listRejectionFollowUps(),
          listProjects(),
        ])
        if (!active) return
        setFollowUps(followUpItems)
        setProjects(projectItems)
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load rejection follow-ups')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadFollowUps()
    return () => {
      active = false
    }
  }, [])

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
