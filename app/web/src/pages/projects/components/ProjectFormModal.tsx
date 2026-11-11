import { Download, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUsers } from '../../../app/queries/useUsers'
import { ErrorMessage } from '../../../components/feedback/ErrorMessage'
import { archiveProject, createProject, updateProject, getSimulatorStatus, getSimulatorProjects, getSimulatorProject, importSimulatorProject } from '../../../data/api'
import type { SimulatorProjectChoice, SimulatorProjectPreview } from '../../../data/api'
import type { ImportMode, Project, ProjectFormInput } from '../../../domain/types'
import { ArchiveProjectAction } from './project-form/ArchiveProjectAction'
import { ProjectAssignmentFields } from './project-form/ProjectAssignmentFields'
import { ProjectBasicFields } from './project-form/ProjectBasicFields'
import { ProjectSourceFields } from './project-form/ProjectSourceFields'

interface ProjectFormModalCommonProps {
  closeTo: string
  currentUserId: string
  onSaved: () => Promise<void>
}

type ProjectFormModalProps = ProjectFormModalCommonProps & (
  | { mode: 'create'; project?: never }
  | { mode: 'edit'; project: Project }
)

const secondaryButtonClasses = 'inline-flex min-h-[38px] items-center justify-center gap-2 rounded-md border button button-secondary px-[13px] font-extrabold no-underline'
const primaryButtonClasses = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border button button-primary px-[15px] font-extrabold'

export function ProjectFormModal({ mode, closeTo, currentUserId, project, onSaved }: ProjectFormModalProps) {
  const navigate = useNavigate()
  const usersQuery = useUsers(currentUserId)
  const users = usersQuery.data ?? []
  const hiringManagers = users.filter((user) => user.role === 'hiring_manager')
  const humanResourceUsers = users.filter((user) => user.role === 'human_resource')
  const [name, setName] = useState(project?.name ?? '')
  const [position, setPosition] = useState(project?.position ?? '')
  const [notes, setNotes] = useState(project?.notes ?? '')
  const [hiringManagerUserId, setHiringManagerUserId] = useState(project?.hiringManagerUserIds[0] ?? '')
  const [assignedHumanResourceUserIds, setAssignedHumanResourceUserIds] = useState<string[]>(project?.assignedHumanResourceUserIds ?? [])
  const [linkedinProjectId, setLinkedinProjectId] = useState(project?.linkedinProjectId ?? '')
  const [importMode, setImportMode] = useState<ImportMode>(project?.importMode ?? 'auto_sync')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [simulatorProject, setSimulatorProject] = useState<SimulatorProjectPreview | null>(null)
  const [simulatorProjects, setSimulatorProjects] = useState<SimulatorProjectChoice[] | null>(null)
  const simulatorStatus = useQuery({ queryKey: ['simulator-status', currentUserId], queryFn: ({ signal }) => getSimulatorStatus(signal), enabled: mode === 'create' })
  const loadingUsers = usersQuery.isPending
  const displayError = error ?? (usersQuery.isError ? usersQuery.error.message : null)

  if (mode === 'edit' && !project) throw new Error('Edit project modal requires a project')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (simulatorProjects && !simulatorProject) { setError('Select an exported simulator project.'); return }

    const input = buildProjectInput()
    if (!input) return

    setSubmitting(true)
    try {
      const savedProject = mode === 'create' && simulatorProject
        ? await importSimulatorProject(simulatorProject.project.id, input)
        : mode === 'create'
        ? await createProject(input)
        : await updateProject(project.id, input)
      await onSaved()
      navigate(mode === 'create' ? `/projects/${savedProject.id}/pipeline/pre_interview` : closeTo)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save project')
    } finally {
      setSubmitting(false)
    }
  }

  async function loadSimulatorProjects() {
    setSubmitting(true)
    setError(null)
    try { setSimulatorProjects(await getSimulatorProjects()) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Could not load simulator projects') }
    finally { setSubmitting(false) }
  }

  async function loadSimulatorProject(id: string) {
    setSimulatorProject(null)
    if (!id) return
    setSubmitting(true)
    setError(null)
    try {
      const source = await getSimulatorProject(id)
      setSimulatorProject(source)
      setName(source.project.name)
      setPosition(source.project.position)
      setLinkedinProjectId('')
      setNotes('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load simulator project')
    } finally { setSubmitting(false) }
  }

  async function handleArchive() {
    if (mode !== 'edit' || !project) throw new Error('Only an existing project can be archived')

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
    if (!name.trim() || !position.trim() || !hiringManagerUserId || assignedHumanResourceUserIds.length === 0) {
      setError('Project name, position, hiring manager, and Human Resource assignment are required.')
      return null
    }

    return {
      name: name.trim(),
      position: position.trim(),
      notes: notes.trim() || undefined,
      hiringManagerUserIds: [hiringManagerUserId],
      assignedHumanResourceUserIds,
      linkedinProjectId: linkedinProjectId.trim() || undefined,
      importMode,
    }
  }

  function toggleHumanResourceUser(userId: string) {
    setAssignedHumanResourceUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    )
  }

  return (
    <div className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-backdrop px-[18px] py-[42px]">
      <form
        className="relative grid w-[min(100%,860px)] max-w-[860px] gap-[22px] rounded-lg bg-white p-7 shadow-modal max-[820px]:p-[22px]"
        onSubmit={handleSubmit}
        aria-labelledby="project-form-title"
      >
        <div className="flex items-start justify-between gap-[18px]">
          <div>
            <p className="m-0 text-[11px] font-extrabold tracking-[0.08em] text-muted uppercase">
              {mode === 'create' ? 'New Project' : 'Project Settings'}
            </p>
            <h2 id="project-form-title" className="m-0 text-[34px] leading-[1.1] font-bold text-heading">
              {mode === 'create' ? 'Create New Project' : 'Edit Project'}
            </h2>
          </div>
          <Link
            className="inline-flex h-9 w-9 items-center justify-center gap-2 rounded-md border button button-secondary font-extrabold no-underline"
            to={closeTo}
            aria-label="Close"
          >
            <X size={18} />
          </Link>
        </div>

        {mode === 'edit' && project && (
          <ArchiveProjectAction project={project} submitting={submitting} onConfirm={handleArchive} />
        )}

        {mode === 'create' && simulatorStatus.data?.enabled && !simulatorProjects && (
          <button type="button" className={secondaryButtonClasses} disabled={submitting} onClick={loadSimulatorProjects}>
            <Download size={18} /> Import Simulator Project
          </button>
        )}
        {simulatorStatus.isError && <ErrorMessage message={simulatorStatus.error.message} />}
        {simulatorProjects ? (
          <section className="border-y border-divider py-4">
            <label htmlFor="simulator-source-project" className="mb-2 block text-sm font-bold">Simulator Project</label>
            <select id="simulator-source-project" className="mb-4 w-full rounded-md border border-border-strong p-2" value={simulatorProject?.project.id ?? ''} disabled={submitting} onChange={(event) => void loadSimulatorProject(event.target.value)}>
              <option value="">Select exported project</option>
              {simulatorProjects.map((source) => <option key={source.id} value={source.id} disabled={source.exportedAt === null}>{source.name}{source.exportedAt === null ? ' (not exported)' : ''}</option>)}
            </select>
            {!simulatorProjects.some((source) => source.exportedAt !== null) && <p>No exported projects available.</p>}
            {simulatorProject && <>
            <h3 className="m-0 text-lg font-bold">{simulatorProject.project.name}</h3>
            <p>{simulatorProject.project.company} / {simulatorProject.project.position}</p>
            <p>{simulatorProject.shortlistedCount} shortlisted / {simulatorProject.candidateCount} source candidates</p>
            <p className="text-sm text-muted">Source: local simulator / Stage: shortlisted / Destination: Pre-interview, Waiting for contact</p>
            </>}
            <button type="button" className={secondaryButtonClasses} disabled={submitting} onClick={() => { setSimulatorProject(null); setSimulatorProjects(null) }}>Cancel Simulator Import</button>
          </section>
        ) : <ProjectBasicFields
          name={name}
          notes={notes}
          position={position}
          onNameChange={setName}
          onNotesChange={setNotes}
          onPositionChange={setPosition}
        />}

        <ProjectAssignmentFields
          assignedHumanResourceUserIds={assignedHumanResourceUserIds}
          hiringManagerUserId={hiringManagerUserId}
          hiringManagers={hiringManagers}
          humanResourceUsers={humanResourceUsers}
          loading={loadingUsers}
          onHiringManagerChange={setHiringManagerUserId}
          onHumanResourceToggle={toggleHumanResourceUser}
        />

        {!simulatorProjects && !project?.simulatorTracking && <ProjectSourceFields
          importMode={importMode}
          linkedinProjectId={linkedinProjectId}
          onImportModeChange={setImportMode}
          onLinkedinProjectIdChange={setLinkedinProjectId}
        />}

        {displayError && <ErrorMessage message={displayError} />}

        <div className="flex justify-end gap-2.5 border-t border-divider pt-5">
          <Link className={secondaryButtonClasses} to={closeTo}>
            Cancel
          </Link>
          <button className={primaryButtonClasses} type="submit" disabled={submitting || loadingUsers || Boolean(simulatorProjects && !simulatorProject)}>
            {submitting ? 'Saving' : simulatorProjects ? 'Import and Track Project' : mode === 'create' ? 'Create Project' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
