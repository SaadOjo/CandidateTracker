import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, RefreshCw } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useCandidates } from '../../app/queries/useCandidates'
import type { AuthSession } from '../../auth/auth'
import { useProject } from '../../app/queries/useProject'
import { ErrorMessage } from '../../components/feedback/ErrorMessage'
import { LoadingState } from '../../components/feedback/LoadingState'
import { SearchField } from '../../components/ui/SearchField'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { syncSimulatorProject, updateProjectStageComment } from '../../data/api'
import { projectStatusLabels, stageLabels, stageOrder } from '../../domain/labels'
import { requireCandidateWorkflowRole } from '../../domain/roles'
import type { Candidate } from '../../domain/types'
import { InlineCommentEditor } from './components/InlineCommentEditor'
import { PipelineTable } from './components/PipelineTable'
import { formatDate, getStageColumns, getStageCounts, isPipelineStage, sortCandidatePriority } from './pipelineHelpers'

interface ProjectPipelinePageProps {
  session: AuthSession
}

const contentWidthClasses = 'mx-auto w-[min(1320px,calc(100vw-330px))] max-w-full max-[1100px]:w-[calc(100vw-48px)] max-[760px]:w-full'
const emptyCandidates: Candidate[] = []
const pipelineModalNames = new Set(['hiring_manager-comments'])

export function ProjectPipelinePage({ session }: ProjectPipelinePageProps) {
  const { projectId, stage } = useParams()
  if (!projectId) throw new Error('Project pipeline route requires a projectId')
  if (!isPipelineStage(stage)) throw new Error(`Invalid pipeline stage: ${String(stage)}`)

  const [searchParams] = useSearchParams()
  const selectedStage = stage
  const role = requireCandidateWorkflowRole(session.appRole)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const projectQuery = useProject(session.userId, projectId)
  const candidatesQuery = useCandidates(
    session.userId,
    { projectId, stage: selectedStage, query: debouncedQuery },
    Boolean(projectId),
    Boolean(projectQuery.data?.simulatorTracking),
  )
  const projectCandidatesQuery = useCandidates(session.userId, { projectId }, Boolean(projectId), Boolean(projectQuery.data?.simulatorTracking))
  const project = projectQuery.data ?? null
  const candidates = candidatesQuery.data ?? emptyCandidates
  const projectCandidates = projectCandidatesQuery.data ?? emptyCandidates
  const loading = projectQuery.isPending || projectCandidatesQuery.isPending
  const error = projectQuery.isError
    ? projectQuery.error.message
    : projectCandidatesQuery.isError ? projectCandidatesQuery.error.message : null

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query)
    }, 140)

    return () => window.clearTimeout(timeout)
  }, [query])

  async function loadPipeline() {
    await Promise.all([
      projectQuery.refetch(),
      candidatesQuery.refetch(),
      projectCandidatesQuery.refetch(),
    ])
  }

  async function syncSource() {
    if (!projectId) return
    setSyncing(true)
    setSyncError(null)
    try {
      await syncSimulatorProject(projectId)
      await loadPipeline()
    } catch (requestError) {
      setSyncError(requestError instanceof Error ? requestError.message : 'Simulator sync failed')
    } finally { setSyncing(false) }
  }

  const columns = getStageColumns(role, selectedStage)
  const sortedCandidates = useMemo(() => [...candidates].sort(sortCandidatePriority), [candidates])
  const stageCounts = useMemo(() => getStageCounts(projectCandidates), [projectCandidates])
  const modal = searchParams.get('modal')
  if (modal !== null && !pipelineModalNames.has(modal)) throw new Error(`Unsupported pipeline modal: ${modal}`)

  if (loading) {
    return (
      <section className={`${contentWidthClasses} mt-10 rounded-lg border border-border bg-white p-[26px]`}>
        <LoadingState label="Loading project pipeline" />
      </section>
    )
  }

  if (error) {
    return <ErrorMessage className={`${contentWidthClasses} mt-10`} message={error} />
  }

  if (!project) throw new Error('Project query completed without project data')
  if (candidatesQuery.isSuccess && !candidatesQuery.data) throw new Error('Candidate query completed without candidate data')
  if (!projectCandidatesQuery.data) throw new Error('Project candidate query completed without candidate data')

  const hasAcceptedOffer = projectCandidates.some((candidate) => candidate.status === 'offer_accepted')
  const status = project.status === 'active' && hasAcceptedOffer ? 'candidate_accepted' : project.status
  const comments = project.stageComments?.filter((comment) => comment.stage === selectedStage && comment.authorRole === 'hiring_manager') ?? []
  const canEditComments = role === 'hiring_manager'
  const userComments = comments.filter((comment) => comment.author?.id === session.userId)
  const visibleComments = canEditComments ? comments.filter((comment) => comment.author?.id !== session.userId) : comments
  const closeTo = `/projects/${projectId}/pipeline/${selectedStage}`
  const commentsOpen = modal === 'hiring_manager-comments'
  const commentsLabel = 'Hiring Manager Comments'

  return (
    <div className="px-5 pt-10 pb-14 max-[760px]:px-3">
      <section className={`${contentWidthClasses} grid justify-items-start gap-y-2.5 text-left`}>
        <div className="flex w-full items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center justify-start gap-[13px]">
              <h1 className="m-0 break-words text-4xl leading-10 font-extrabold text-heading">{project.name}</h1>
              <span
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-surface-action px-2 text-sm font-extrabold text-ink"
                aria-label={`${project.candidateCount} total candidates`}
                title="Total candidates"
              >
                {project.candidateCount}
              </span>
              <StatusBadge label={projectStatusLabels[status]} tone={status} />
            </div>
            <p className="m-0 text-[15px] text-body">Position: {project.position}</p>
            {project.notes && <small className="mt-0.5 block text-xs leading-[18px] text-muted italic">{project.notes}</small>}
          </div>
          <div className="grid justify-items-end gap-2.5 pt-0.5 text-right">
            {project.createdAt && (
              <div>
                <span className="block text-[11px] font-extrabold text-faint uppercase">Created</span>
                <strong className="mt-1 block text-[13px] font-bold text-body">{formatDate(project.createdAt)}</strong>
              </div>
            )}
            {project.archivedAt && (
              <div>
                <span className="block text-[11px] font-extrabold text-faint uppercase">Archived</span>
                <strong className="mt-1 block text-[13px] font-bold text-body">{formatDate(project.archivedAt)}</strong>
              </div>
            )}
          </div>
        </div>
      </section>

      {project.simulatorTracking && (
        <section className={`${contentWidthClasses} mt-6 border-y border-divider py-3`} aria-label="Simulator tracking">
          <div className="flex justify-end">
            <div className="ml-auto grid justify-items-end gap-2 text-right">
              {role === 'human_resource' && status === 'active' && (
                <button type="button" disabled={syncing} onClick={syncSource} className="inline-flex items-center gap-2 rounded-md border button button-secondary px-3 py-2 text-sm font-bold">
                  <RefreshCw size={16} />{syncing ? 'Syncing' : 'Sync Now'}
                </button>
              )}
              <p className="m-0 text-xs text-muted">
                {status !== 'active' ? 'Tracking paused' : 'Last checked'}
                {project.simulatorTracking.lastSyncedAt ? `: ${new Date(project.simulatorTracking.lastSyncedAt).toLocaleString()}` : ': Not yet synced'}
              </p>
            </div>
          </div>
          {(syncError || project.simulatorTracking.lastError) && <ErrorMessage className="mt-3" message={syncError ?? project.simulatorTracking.lastError!} />}
        </section>
      )}

      <section className={`${contentWidthClasses} mt-8 rounded-lg border border-border-strong bg-surface-neutral pt-6`} aria-label="Pipeline controls">
        <nav className="mx-6 mb-4 grid grid-cols-5 gap-1 max-[760px]:mx-4 max-[760px]:grid-cols-1" aria-label="Pipeline stages">
          {stageOrder.map((item) => {
            const active = item === selectedStage
            return (
              <Link
                className={`flex min-h-12 items-center justify-center rounded-t border-b-2 px-2 py-2 text-center text-sm no-underline control-selectable pipeline-stage ${active ? 'font-extrabold' : 'font-semibold'}`}
                key={item}
                aria-current={active ? 'page' : undefined}
                to={`/projects/${projectId}/pipeline/${item}`}
              >
                <span>{stageLabels[item]}</span>
                <small className={`ml-2 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-[7px] text-xs font-bold selection-count`}>
                  {stageCounts[item]}
                </small>
              </Link>
            )
          })}
        </nav>

        {selectedStage === 'pre_interview' && (
          <div className="px-6 pb-4 max-[760px]:px-4">
            <div className="flex justify-center gap-3">
              <button
                className="inline-flex h-[30px] min-w-14 items-center justify-center gap-2 rounded-sm border-0 button button-text px-2.5 text-xs font-extrabold"
                type="button"
                aria-expanded={commentsOpen}
                aria-controls={commentsOpen ? 'stage-comments' : undefined}
                onClick={() => navigate(commentsOpen ? closeTo : `${closeTo}?modal=hiring_manager-comments`)}
              >
                {commentsLabel}
                <ChevronDown size={14} className={commentsOpen ? 'rotate-180' : ''} />
              </button>
            </div>
            {commentsOpen && (
              <div id="stage-comments">
                {visibleComments.map((comment) => (
                  <div className="mt-3 text-sm leading-6 text-body" key={comment.id}>
                    {comment.author && <strong className="text-xs text-muted">{comment.author.name}</strong>}
                    <p className="m-0 whitespace-pre-wrap">{comment.body}</p>
                  </div>
                ))}
                {!canEditComments && comments.length === 0 && <p className="mt-3 mb-0 text-center text-sm text-muted">No comments yet.</p>}
                {canEditComments && (
                  <InlineCommentEditor
                    key={session.userId}
                    id="stage-comments-editor"
                    label={commentsLabel}
                    initialValue={userComments.map((comment) => comment.body).join('\n\n')}
                    onClose={() => navigate(closeTo)}
                    onSave={async (body) => {
                      await updateProjectStageComment(projectId, 'pre_interview', body)
                      await loadPipeline()
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}

      </section>

      <section className={`${contentWidthClasses} mt-5 rounded-lg border border-border bg-surface-subtle`} aria-label="Candidates">
        <div className="px-6 pt-4 pb-3">
          <SearchField
            variant="toolbar"
            iconSize={17}
            className="mx-auto w-[min(400px,100%)]"
            placeholder="Search candidate name..."
            value={query}
            onChange={setQuery}
          />
        </div>
        {candidatesQuery.isError ? (
          <ErrorMessage className="px-6 pb-6" message={candidatesQuery.error.message} />
        ) : (
          <PipelineTable
            candidates={sortedCandidates}
            columns={columns}
            loading={candidatesQuery.isPending}
            projectId={projectId}
            role={role}
            stage={selectedStage}
          />
        )}
      </section>

    </div>
  )
}
