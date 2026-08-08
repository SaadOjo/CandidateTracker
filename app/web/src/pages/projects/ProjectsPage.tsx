import { Archive, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ErrorMessage } from '../../components/feedback/ErrorMessage'
import { LoadingState } from '../../components/feedback/LoadingState'
import { SearchField } from '../../components/ui/SearchField'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useProjects } from '../../app/queries/useProjects'
import { projectStatusLabels } from '../../domain/labels'
import type { AuthSession, Project } from '../../domain/types'
import { ProjectCard } from './components/ProjectCard'
import { ProjectFormModal } from './components/ProjectFormModal'

interface ProjectsPageProps {
  session: AuthSession
  modal?: 'new' | 'edit'
  view?: 'default' | 'archived'
}

const projectCardClasses = 'relative flex min-h-[236px] flex-col justify-between rounded-lg border p-6 text-inherit no-underline'
const emptyProjects: Project[] = []

export function ProjectsPage({ session, modal, view = 'default' }: ProjectsPageProps) {
  const { projectId } = useParams()
  const canManageProjects = session.appRole === 'admin' || session.appRole === 'human_resource'
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const projectsQuery = useProjects(session.userId, { query: debouncedQuery })
  const projects = projectsQuery.data ?? emptyProjects
  const loading = projectsQuery.isPending
  const error = projectsQuery.isError ? projectsQuery.error.message : null

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query)
    }, 160)

    return () => window.clearTimeout(timeout)
  }, [query])

  async function refreshProjects() {
    await projectsQuery.refetch()
  }

  const activeProjects = useMemo(() => projects.filter((project) => project.status === 'active'), [projects])
  const archivedProjects = useMemo(() => projects.filter((project) => project.status === 'archived'), [projects])
  const visibleProjects = view === 'archived' ? archivedProjects : activeProjects
  const selectedProject = projects.find((project) => project.id === projectId)

  if (modal && !canManageProjects) return <Navigate to="/projects" replace />
  if (modal === 'edit' && !projectId) throw new Error('Edit project route requires a projectId')
  if (modal === 'edit' && !loading && !error && !selectedProject) {
    throw new Error(`Edit project route references an unknown project: ${projectId}`)
  }

  return (
    <>
      <section className="grid gap-6 px-8 pt-10 pb-14 max-[760px]:px-3">
        <div className="flex items-start justify-between gap-[18px] max-[820px]:flex-col">
          <div>
            <h2 className="m-0 text-[34px] leading-[1.1] font-bold text-heading">
              {view === 'archived' ? 'Archived Projects' : 'Projects'}
            </h2>
            {view === 'archived' && (
              <Link className="mt-2 inline-flex rounded-md py-[9px] pr-[11px] pl-0 text-sm font-bold text-body no-underline" to="/projects">
                Projects
              </Link>
            )}
          </div>
          {canManageProjects && view === 'default' && (
            <Link
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-action-primary bg-action-primary px-[15px] font-extrabold text-white no-underline"
              to="/projects/new"
            >
              <Plus size={18} />
              New Project
            </Link>
          )}
        </div>

        <SearchField
          className="max-w-[448px]"
          iconSize={19}
          placeholder={view === 'archived' ? 'Search archived project...' : 'Search project...'}
          value={query}
          variant="bordered"
          onChange={setQuery}
        />

        {error && <ErrorMessage message={error} />}

        {loading ? (
          <LoadingState />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[22px]">
            {visibleProjects.map((project) => (
              <ProjectCard key={project.id} project={project} canManage={canManageProjects} />
            ))}

            {view === 'default' && (
              <Link
                className={`${projectCardClasses} border-border-strong bg-surface-subtle`}
                to="/projects/archived"
              >
                <StatusBadge label={projectStatusLabels.archived} tone="muted" />
                <Archive className="absolute top-[22px] right-[22px] text-muted" size={21} />
                <div>
                  <h3 className="mt-[22px] mb-1.5 text-xl leading-tight font-bold text-ink">
                    Archived Projects ({archivedProjects.length})
                  </h3>
                  <p className="m-0 text-sm leading-[1.45] text-body">View completed hiring projects.</p>
                </div>
              </Link>
            )}

            {view === 'default' && canManageProjects && (
              <Link
                className={`${projectCardClasses} items-center justify-center border-2 border-dashed border-accent-muted bg-white text-center text-accent`}
                to="/projects/new"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent-surface">
                  <Plus size={24} />
                </span>
                <h3 className="mt-[22px] mb-1.5 text-xl leading-tight font-bold text-ink">Launch New Project</h3>
              </Link>
            )}

            {visibleProjects.length === 0 && <p className="m-0 flex items-center gap-2 text-muted">No projects found.</p>}
          </div>
        )}
      </section>

      {modal === 'new' && (
        <ProjectFormModal mode="create" closeTo="/projects" currentUserId={session.userId} onSaved={refreshProjects} />
      )}
      {modal === 'edit' && selectedProject && (
        <ProjectFormModal
          mode="edit"
          closeTo="/projects"
          currentUserId={session.userId}
          project={selectedProject}
          onSaved={refreshProjects}
        />
      )}
    </>
  )
}
