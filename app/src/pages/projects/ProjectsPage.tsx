import {
  Archive,
  ArrowRight,
  CheckCircle2,
  Download,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { archiveProject, createProject, listProjects, listUsers, updateProject } from '../../data/api'
import { projectStatusLabels, userRoleLabels } from '../../domain/labels'
import type { AuthSession, ImportMode, Project, ProjectFormInput, User } from '../../domain/types'

interface ProjectsPageProps {
  session: AuthSession
  modal?: 'new' | 'edit'
  view?: 'default' | 'archived'
}

export function ProjectsPage({ session, modal, view = 'default' }: ProjectsPageProps) {
  const { projectId } = useParams()
  const canManageProjects = session.appRole === 'admin' || session.appRole === 'hr'
  const [projects, setProjects] = useState<Project[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setProjects(await listProjects({ query }))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load projects')
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshProjects()
    }, 160)

    return () => window.clearTimeout(timeout)
  }, [refreshProjects])

  const activeProjects = useMemo(() => projects.filter((project) => project.status === 'active'), [projects])
  const archivedProjects = useMemo(() => projects.filter((project) => project.status === 'archived'), [projects])
  const visibleProjects = view === 'archived' ? archivedProjects : activeProjects
  const selectedProject = projects.find((project) => project.id === projectId)

  if (modal && !canManageProjects) return <Navigate to="/projects" replace />

  return (
    <>
      <section className="projects-screen">
        <div className="screen-title-row">
          <div>
            <h2>{view === 'archived' ? 'Archived Projects' : 'Projects'}</h2>
            {view === 'archived' && (
              <Link className="back-link" to="/projects">
                Projects
              </Link>
            )}
          </div>
          {canManageProjects && view === 'default' && (
            <Link className="primary-button" to="/projects/new">
              <Plus size={18} />
              New Project
            </Link>
          )}
        </div>

        <label className="search-field">
          <Search size={19} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={view === 'archived' ? 'Search archived project...' : 'Search project...'}
          />
        </label>

        {error && <p className="request-error">{error}</p>}

        {loading ? (
          <div className="loading-row">
            <LoaderCircle className="spin" size={18} />
            Loading
          </div>
        ) : (
          <div className={`project-grid ${view === 'archived' ? 'project-grid--archived' : ''}`}>
            {visibleProjects.map((project) => (
              <ProjectCard key={project.id} project={project} canManage={canManageProjects} />
            ))}

            {view === 'default' && (
              <Link className="project-card project-card--utility" to="/projects/archived">
                <StatusBadge label={projectStatusLabels.archived} tone="muted" />
                <Archive className="card-corner" size={21} />
                <div>
                  <h3>Archived Projects ({archivedProjects.length})</h3>
                  <p>View completed hiring projects.</p>
                </div>
              </Link>
            )}

            {view === 'default' && canManageProjects && (
              <Link className="project-card project-card--new" to="/projects/new">
                <span className="plus-tile">
                  <Plus size={24} />
                </span>
                <h3>Launch New Project</h3>
              </Link>
            )}

            {visibleProjects.length === 0 && <p className="empty-row">No projects found.</p>}
          </div>
        )}
      </section>

      {modal === 'new' && (
        <ProjectFormModal mode="create" closeTo="/projects" onSaved={refreshProjects} />
      )}
      {modal === 'edit' && selectedProject && (
        <ProjectFormModal
          mode="edit"
          closeTo="/projects"
          project={selectedProject}
          onSaved={refreshProjects}
        />
      )}
    </>
  )
}

function ProjectCard({ project, canManage }: { project: Project; canManage: boolean }) {
  const badgeLabel =
    project.status === 'active' && project.hasAcceptedOffer
      ? projectStatusLabels.candidate_accepted
      : projectStatusLabels[project.status]
  const badgeTone = project.status === 'active' && project.hasAcceptedOffer ? 'success' : project.status

  return (
    <article className="project-card">
      <StatusBadge label={badgeLabel} tone={badgeTone} />
      <Link className="card-corner card-link-icon" to={`/projects/${project.id}/pipeline/pre_interview`} aria-label={project.name}>
        <ArrowRight size={22} />
      </Link>
      <div>
        <h3>{project.name}</h3>
        <p>{project.position}</p>
      </div>
      <div className="project-card-footer">
        <span className="avatar-stack" aria-label={`${project.candidateCount} candidates`}>
          <span className="avatar">{project.hiringManager.slice(0, 1) || 'H'}</span>
          <span className="count-pill">{project.candidateCount}</span>
        </span>
        {canManage && project.status === 'active' && (
          <Link className="secondary-button compact" to={`/projects/${project.id}/edit`}>
            <Pencil size={14} />
            Edit
          </Link>
        )}
      </div>
    </article>
  )
}

function ProjectFormModal({
  mode,
  closeTo,
  project,
  onSaved,
}: {
  mode: 'create' | 'edit'
  closeTo: string
  project?: Project
  onSaved: () => Promise<void>
}) {
  const navigate = useNavigate()
  const [hiringManagers, setHiringManagers] = useState<User[]>([])
  const [hrUsers, setHrUsers] = useState<User[]>([])
  const [name, setName] = useState(project?.name ?? '')
  const [position, setPosition] = useState(project?.position ?? '')
  const [notes, setNotes] = useState(project?.notes ?? '')
  const [hiringManagerUserId, setHiringManagerUserId] = useState(project?.hiringManagerUserIds[0] ?? '')
  const [assignedHrUserIds, setAssignedHrUserIds] = useState<string[]>(project?.assignedHrUserIds ?? [])
  const [linkedinProjectId, setLinkedinProjectId] = useState(project?.linkedinProjectId ?? '')
  const [importMode, setImportMode] = useState<ImportMode>(project?.importMode ?? 'auto_sync')
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadAssignableUsers() {
      setLoadingUsers(true)
      setError(null)
      try {
        const [managerItems, hrItems] = await Promise.all([listUsers('hiring_manager'), listUsers('hr_manager')])
        if (!active) return
        setHiringManagers(managerItems)
        setHrUsers(hrItems)
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load users')
      } finally {
        if (active) setLoadingUsers(false)
      }
    }

    void loadAssignableUsers()

    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const input = buildProjectInput()
    if (!input) return

    setSubmitting(true)
    try {
      const savedProject =
        mode === 'create' ? await createProject(input) : await updateProject(project?.id ?? '', input)
      await onSaved()
      navigate(mode === 'create' ? `/projects/${savedProject.id}/pipeline/pre_interview` : closeTo)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save project')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleArchive() {
    if (!project) return

    setSubmitting(true)
    setError(null)
    try {
      await archiveProject(project.id)
      await onSaved()
      navigate('/projects/archived')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not archive project')
    } finally {
      setSubmitting(false)
    }
  }

  function buildProjectInput(): ProjectFormInput | null {
    if (!name.trim() || !position.trim() || !hiringManagerUserId || assignedHrUserIds.length === 0) {
      setError('Project name, position, hiring manager, and HR assignment are required.')
      return null
    }

    return {
      name: name.trim(),
      position: position.trim(),
      notes: notes.trim() || undefined,
      hiringManagerUserIds: [hiringManagerUserId],
      assignedHrUserIds,
      linkedinProjectId: linkedinProjectId.trim() || undefined,
      importMode,
    }
  }

  function toggleHrUser(userId: string) {
    setAssignedHrUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    )
  }

  return (
    <div className="modal-backdrop">
      <form className="project-modal" onSubmit={handleSubmit} aria-labelledby="project-form-title">
        <div className="modal-title-row">
          <div>
            <p className="eyebrow">{mode === 'create' ? 'New Project' : 'Project Settings'}</p>
            <h2 id="project-form-title">{mode === 'create' ? 'Create New Project' : 'Edit Project'}</h2>
          </div>
          <Link className="icon-button" to={closeTo} aria-label="Close">
            <X size={18} />
          </Link>
        </div>

        {mode === 'edit' && project && (
          <div className="archive-control">
            <button type="button" className="secondary-button" onClick={() => setArchiveConfirmOpen(true)}>
              <Download size={15} />
              Archive Project
            </button>
            {archiveConfirmOpen && (
              <div className="archive-popover">
                <h3>Archive this project?</h3>
                <p>
                  {project.hasAcceptedOffer
                    ? 'This project has an accepted offer and will move to Archived Projects.'
                    : 'This project has no accepted offer yet and will move to Archived Projects.'}
                </p>
                <div className="popover-actions">
                  <button type="button" onClick={() => setArchiveConfirmOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className="danger-button" onClick={handleArchive} disabled={submitting}>
                    Archive
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <section className="form-section">
          <h3>Basic Information</h3>
          <div className="two-column">
            <label>
              <span>Project Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Q4 Engineering Expansion" />
            </label>
            <label>
              <span>Job Position Name</span>
              <input value={position} onChange={(event) => setPosition(event.target.value)} placeholder="Senior Backend Engineer" />
            </label>
          </div>
          <label>
            <span>Notes</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Brief project notes" />
          </label>
        </section>

        <section className="form-section">
          <h3>Team Assignment</h3>
          {loadingUsers ? (
            <div className="loading-row compact-loader">
              <LoaderCircle className="spin" size={16} />
              Loading
            </div>
          ) : (
            <div className="two-column">
              <label>
                <span>Hiring Manager</span>
                <select value={hiringManagerUserId} onChange={(event) => setHiringManagerUserId(event.target.value)}>
                  <option value="">Select hiring manager</option>
                  {hiringManagers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="field-group">
                <span>Assigned HR Users</span>
                <div className="checkbox-stack">
                  {hrUsers.map((user) => (
                    <label key={user.id} className="check-row">
                      <input
                        type="checkbox"
                        checked={assignedHrUserIds.includes(user.id)}
                        onChange={() => toggleHrUser(user.id)}
                      />
                      <span>
                        {user.name}
                        <small>{userRoleLabels[user.role]}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="form-section">
          <h3>LinkedIn Setup</h3>
          <div className="two-column linkedin-row">
            <label>
              <span>Recruiter Project ID</span>
              <input
                value={linkedinProjectId}
                onChange={(event) => setLinkedinProjectId(event.target.value)}
                placeholder="LI-2026-0042"
              />
            </label>
            <div className="field-group">
              <span>Import Source</span>
              <div className="segmented-control">
                <button
                  type="button"
                  className={importMode === 'auto_sync' ? 'active' : ''}
                  onClick={() => setImportMode('auto_sync')}
                >
                  {importMode === 'auto_sync' && <CheckCircle2 size={15} />}
                  Auto-Sync
                </button>
                <button
                  type="button"
                  className={importMode === 'manual_import' ? 'active' : ''}
                  onClick={() => setImportMode('manual_import')}
                >
                  {importMode === 'manual_import' && <CheckCircle2 size={15} />}
                  Manual Import
                </button>
              </div>
            </div>
          </div>
        </section>

        {error && <p className="request-error">{error}</p>}

        <div className="modal-actions">
          <Link className="secondary-button" to={closeTo}>
            Cancel
          </Link>
          <button className="primary-button" type="submit" disabled={submitting || loadingUsers}>
            {submitting ? 'Saving' : mode === 'create' ? 'Create Project' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

function StatusBadge({ label, tone }: { label: string; tone: string }) {
  return <span className={`status-badge status-badge--${tone}`}>{label}</span>
}
