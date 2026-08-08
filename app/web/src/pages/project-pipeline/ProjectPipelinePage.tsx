import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useCandidates } from '../../app/queries/useCandidates'
import { useProject } from '../../app/queries/useProject'
import { ErrorMessage } from '../../components/feedback/ErrorMessage'
import { LoadingState } from '../../components/feedback/LoadingState'
import { SearchField } from '../../components/ui/SearchField'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { updateProjectStageComment } from '../../data/api'
import { projectStatusLabels, stageLabels, stageOrder } from '../../domain/labels'
import { requireCandidateWorkflowRole } from '../../domain/roles'
import type { AuthSession, Candidate } from '../../domain/types'
import { BasicCommentModal } from './components/BasicCommentModal'
import { PipelineTable } from './components/PipelineTable'
import { formatDate, getStageColumns, getStageCounts, isPipelineStage, sortCandidatePriority } from './pipelineHelpers'

interface ProjectPipelinePageProps {
  session: AuthSession
}

const contentWidthClasses = 'mx-auto w-[min(1320px,calc(100vw-330px))] max-w-full max-[1100px]:w-[calc(100vw-48px)] max-[760px]:w-full'
const emptyCandidates: Candidate[] = []
const pipelineModalNames = new Set(['hiring_manager-comments', 'human_resource-comments'])

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
  const projectQuery = useProject(session.userId, projectId)
  const candidatesQuery = useCandidates(
    session.userId,
    { projectId, stage: selectedStage, query: debouncedQuery },
    Boolean(projectId),
  )
  const projectCandidatesQuery = useCandidates(session.userId, { projectId }, Boolean(projectId))
  const project = projectQuery.data ?? null
  const candidates = candidatesQuery.data ?? emptyCandidates
  const projectCandidates = projectCandidatesQuery.data ?? emptyCandidates
  const loading = projectQuery.isPending || candidatesQuery.isPending || projectCandidatesQuery.isPending
  const error = projectQuery.isError
    ? projectQuery.error.message
    : candidatesQuery.isError
      ? candidatesQuery.error.message
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

  const columns = getStageColumns(role, selectedStage)
  const sortedCandidates = useMemo(() => [...candidates].sort(sortCandidatePriority), [candidates])
  const stageCounts = useMemo(() => getStageCounts(projectCandidates), [projectCandidates])
  const modal = searchParams.get('modal')
  if (modal !== null && !pipelineModalNames.has(modal)) throw new Error(`Unsupported pipeline modal: ${modal}`)
  if (modal === 'hiring_manager-comments' && role !== 'hiring_manager') {
    throw new Error('Hiring Manager comments modal requires the Hiring Manager role')
  }
  if (modal === 'human_resource-comments' && role !== 'human_resource') {
    throw new Error('Human Resource comments modal requires the Human Resource role')
  }

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
  if (!candidatesQuery.data) throw new Error('Candidate query completed without candidate data')
  if (!projectCandidatesQuery.data) throw new Error('Project candidate query completed without candidate data')

  const hasAcceptedOffer = projectCandidates.some((candidate) => candidate.status === 'offer_accepted')
  const status = project.status === 'active' && hasAcceptedOffer ? 'candidate_accepted' : project.status
  const comments = project.stageComments?.filter((comment) => comment.stage === selectedStage) ?? []
  const userCommentRole = role === 'hiring_manager' ? 'hiring_manager' : 'human_resource'
  const userComments = comments.filter((comment) => comment.authorRole === userCommentRole)
  const totalCandidates = project.candidateCount
  const closeTo = `/projects/${projectId}/pipeline/${selectedStage}`

  return (
    <div className="px-5 pt-10 pb-14 max-[760px]:px-3">
      <section className={`${contentWidthClasses} grid justify-items-start gap-y-2.5 text-left`}>
        <div className="flex w-full items-start justify-between gap-6">
          <div>
            <div className="mb-2 flex items-center justify-start gap-[13px]">
              <h1 className="m-0 text-4xl leading-10 font-extrabold text-heading">Project Pipeline</h1>
              <StatusBadge label={projectStatusLabels[status]} tone={status} />
            </div>
            <h2 className="m-0 text-2xl leading-[30px] font-bold text-subtle">{project.name}</h2>
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

      <div className={`${contentWidthClasses} mt-[76px]`}>
        <SearchField
          className="mr-auto ml-0 w-[min(448px,100%)]"
          placeholder="Search candidate name..."
          value={query}
          onChange={setQuery}
        />
      </div>

      <nav className={`${contentWidthClasses} mt-3.5 grid h-[57px] grid-cols-5 items-end gap-0 max-[760px]:h-auto max-[760px]:grid-cols-1`} aria-label="Pipeline stages">
        {stageOrder.map((item) => {
          const active = item === selectedStage
          return (
            <Link
              className={`flex h-[57px] items-center justify-center rounded-none border-b-2 px-2 text-center text-sm no-underline max-[760px]:h-[42px] ${active ? 'border-heading font-extrabold text-heading' : 'border-transparent font-semibold text-body'}`}
              key={item}
              to={`/projects/${projectId}/pipeline/${item}`}
            >
              <span>{stageLabels[item]}</span>
              <small className={`ml-2 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-[7px] text-xs font-bold ${active ? 'bg-heading text-white' : 'bg-surface-muted text-body'}`}>
                {stageCounts[item]}
              </small>
            </Link>
          )
        })}
      </nav>

      {selectedStage === 'pre_interview' && (
        <section className={`${contentWidthClasses} mt-[26px]`}>
          <div className="flex gap-3">
            <button className="inline-flex h-[30px] min-w-14 items-center justify-center rounded-sm border-0 bg-action-primary px-2.5 text-xs font-extrabold text-white" type="button" onClick={() => navigate(`${closeTo}?modal=${role}-comments`)}>
              {role === 'hiring_manager' ? 'Hiring Manager Comments' : 'Human Resource Comments'}
            </button>
          </div>
        </section>
      )}

      <PipelineTable
        candidates={sortedCandidates}
        columns={columns}
        loading={loading}
        projectId={projectId}
        role={role}
        stage={selectedStage}
        totalCandidates={totalCandidates}
      />

      {modal === 'hiring_manager-comments' && (
        <BasicCommentModal
          title="Hiring Manager Comments"
          closeTo={closeTo}
          initialValue={userComments.map((comment) => comment.body).join('\n\n')}
          onSave={async (body) => {
            await updateProjectStageComment(projectId, 'pre_interview', body)
            await loadPipeline()
          }}
        />
      )}
      {modal === 'human_resource-comments' && (
        <BasicCommentModal
          title="Human Resource Comments"
          closeTo={closeTo}
          initialValue={userComments.map((comment) => comment.body).join('\n\n')}
          onSave={async (body) => {
            await updateProjectStageComment(projectId, 'pre_interview', body)
            await loadPipeline()
          }}
        />
      )}
    </div>
  )
}
