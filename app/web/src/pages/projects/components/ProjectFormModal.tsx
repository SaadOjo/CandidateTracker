import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ErrorMessage } from '../../../components/feedback/ErrorMessage'
import { archiveProject, createProject, listUsers, updateProject } from '../../../data/api'
import type { ImportMode, Project, ProjectFormInput, User } from '../../../domain/types'
import { ArchiveProjectAction } from './project-form/ArchiveProjectAction'
import { ProjectAssignmentFields } from './project-form/ProjectAssignmentFields'
import { ProjectBasicFields } from './project-form/ProjectBasicFields'
import { ProjectSourceFields } from './project-form/ProjectSourceFields'

interface ProjectFormModalProps {
  mode: 'create' | 'edit'
  closeTo: string
  project?: Project
  onSaved: () => Promise<void>
}

const secondaryButtonClasses = 'inline-flex min-h-[38px] items-center justify-center gap-2 rounded-md border border-border-strong bg-white px-[13px] font-extrabold text-ink no-underline'
const primaryButtonClasses = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-action-primary bg-action-primary px-[15px] font-extrabold text-white'

export function ProjectFormModal({ mode, closeTo, project, onSaved }: ProjectFormModalProps) {
  const navigate = useNavigate()
  const [hiringManagers, setHiringManagers] = useState<User[]>([])
  const [humanResourceUsers, setHumanResourceUsers] = useState<User[]>([])
  const [name, setName] = useState(project?.name ?? '')
  const [position, setPosition] = useState(project?.position ?? '')
  const [notes, setNotes] = useState(project?.notes ?? '')
  const [hiringManagerUserId, setHiringManagerUserId] = useState(project?.hiringManagerUserIds[0] ?? '')
  const [assignedHumanResourceUserIds, setAssignedHumanResourceUserIds] = useState<string[]>(project?.assignedHumanResourceUserIds ?? [])
  const [linkedinProjectId, setLinkedinProjectId] = useState(project?.linkedinProjectId ?? '')
  const [importMode, setImportMode] = useState<ImportMode>(project?.importMode ?? 'auto_sync')
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadAssignableUsers() {
      setLoadingUsers(true)
      setError(null)
      try {
        const [managerItems, humanResourceItems] = await Promise.all([listUsers('hiring_manager'), listUsers('human_resource')])
        if (!active) return
        setHiringManagers(managerItems)
        setHumanResourceUsers(humanResourceItems)
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
            className="inline-flex h-9 w-9 items-center justify-center gap-2 rounded-md border border-border-strong bg-white font-extrabold text-body no-underline"
            to={closeTo}
            aria-label="Close"
          >
            <X size={18} />
          </Link>
        </div>

        {mode === 'edit' && project && (
          <ArchiveProjectAction project={project} submitting={submitting} onConfirm={handleArchive} />
        )}

        <ProjectBasicFields
          name={name}
          notes={notes}
          position={position}
          onNameChange={setName}
          onNotesChange={setNotes}
          onPositionChange={setPosition}
        />

        <ProjectAssignmentFields
          assignedHumanResourceUserIds={assignedHumanResourceUserIds}
          hiringManagerUserId={hiringManagerUserId}
          hiringManagers={hiringManagers}
          humanResourceUsers={humanResourceUsers}
          loading={loadingUsers}
          onHiringManagerChange={setHiringManagerUserId}
          onHumanResourceToggle={toggleHumanResourceUser}
        />

        <ProjectSourceFields
          importMode={importMode}
          linkedinProjectId={linkedinProjectId}
          onImportModeChange={setImportMode}
          onLinkedinProjectIdChange={setLinkedinProjectId}
        />

        {error && <ErrorMessage message={error} />}

        <div className="flex justify-end gap-2.5 border-t border-divider pt-5">
          <Link className={secondaryButtonClasses} to={closeTo}>
            Cancel
          </Link>
          <button className={primaryButtonClasses} type="submit" disabled={submitting || loadingUsers}>
            {submitting ? 'Saving' : mode === 'create' ? 'Create Project' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
