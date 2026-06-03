import { LoaderCircle, Phone, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProject, listCandidates } from '../../data/api'
import { projectStatusLabels, stageLabels, stageOrder, statusLabels } from '../../domain/labels'
import type { AuthSession, Candidate, CandidateStatus, PipelineStage, Project } from '../../domain/types'

interface ProjectPipelinePageProps {
  session: AuthSession
}

type PipelineColumn = 'candidate' | 'status' | 'contact' | 'interview' | 'actions'

export function ProjectPipelinePage({ session }: ProjectPipelinePageProps) {
  const { projectId = '', stage = 'pre_interview' } = useParams()
  const selectedStage = isPipelineStage(stage) ? stage : 'pre_interview'
  const role = session.appRole === 'hm' ? 'hm' : 'hr'
  const [project, setProject] = useState<Project | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [projectCandidates, setProjectCandidates] = useState<Candidate[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPipeline = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const [projectItem, stageCandidates, allCandidates] = await Promise.all([
        getProject(projectId),
        listCandidates({ projectId, stage: selectedStage, query }),
        listCandidates({ projectId }),
      ])
      setProject(projectItem)
      setCandidates(stageCandidates)
      setProjectCandidates(allCandidates)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load pipeline')
    } finally {
      setLoading(false)
    }
  }, [projectId, query, selectedStage])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadPipeline()
    }, 140)

    return () => window.clearTimeout(timeout)
  }, [loadPipeline])

  const columns = getStageColumns(role, selectedStage)
  const sortedCandidates = useMemo(() => [...candidates].sort(sortCandidatePriority), [candidates])
  const stageCounts = useMemo(() => getStageCounts(projectCandidates), [projectCandidates])
  const hasAcceptedOffer = projectCandidates.some((candidate) => candidate.status === 'offer_accepted')
  const status = project?.status === 'active' && hasAcceptedOffer ? 'candidate_accepted' : project?.status ?? 'active'
  const comments = project?.stageComments?.filter((comment) => comment.stage === selectedStage) ?? []
  const totalCandidates = project?.candidateCount ?? projectCandidates.length

  return (
    <div className="pipeline-screen">
      <section className="pipeline-title-block">
        <div className="pipeline-title-header">
          <div>
            <div className="title-line">
              <h1>Project Pipeline</h1>
              <span className={`status-badge status-badge--${status}`}>{projectStatusLabels[status]}</span>
            </div>
            <h2>{project?.name ?? 'Project'}</h2>
            <p>Position: {project?.position ?? '—'}</p>
            {project?.notes && <small className="pipeline-project-note">{project.notes}</small>}
          </div>
          <div className="project-date-block">
            {project?.createdAt && (
              <div>
                <span>Created</span>
                <strong>{formatDate(project.createdAt)}</strong>
              </div>
            )}
            {project?.archivedAt && (
              <div>
                <span>Archived</span>
                <strong>{formatDate(project.archivedAt)}</strong>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="pipeline-search-row">
        <label className="search-input candidate-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search candidate name..."
          />
        </label>
      </div>

      <nav className="figma-stage-tabs" aria-label="Pipeline stages">
        {stageOrder.map((item) => (
          <Link
            className={item === selectedStage ? 'active' : ''}
            key={item}
            to={`/projects/${projectId}/pipeline/${item}`}
          >
            <span>{stageLabels[item]}</span>
            <small>{stageCounts[item]}</small>
          </Link>
        ))}
      </nav>

      {selectedStage === 'pre_interview' && comments.length > 0 && (
        <section className="pre-interview-comments-panel">
          <div className="pre-interview-comments-grid">
            <CommentColumn title="HM Comments" items={comments.filter((item) => item.authorRole === 'hiring_manager')} />
            <CommentColumn title="HR Comments" items={comments.filter((item) => item.authorRole === 'hr')} />
          </div>
        </section>
      )}

      {error && <p className="request-error pipeline-error">{error}</p>}

      <section className="figma-table-card">
        <div className={`figma-table-row figma-table-header figma-table-row--${selectedStage} figma-table-row--role-${role}`}>
          {columns.includes('candidate') && <span className="column-header">Candidate Name</span>}
          {columns.includes('status') && <span className="column-header">Status</span>}
          {columns.includes('contact') && <span className="column-header contact-column-header">Contact</span>}
          {columns.includes('interview') && <span className="column-header">Interview Info</span>}
          {columns.includes('actions') && <span className="column-header">Actions</span>}
        </div>

        {loading ? (
          <div className="loading-row table-loading">
            <LoaderCircle className="spin" size={18} />
            Loading
          </div>
        ) : sortedCandidates.length > 0 ? (
          sortedCandidates.map((candidate, index) => (
            <div className={`figma-table-row figma-table-row--${selectedStage} figma-table-row--role-${role}`} key={candidate.id}>
              {columns.includes('candidate') && (
                <Link className="candidate-cell candidate-cell-link" to={`/projects/${projectId}/candidates/${candidate.id}`}>
                  {selectedStage === 'offer_stage' && getOfferRankLabel(index) && <small className="offer-rank-label">{getOfferRankLabel(index)}</small>}
                  <Avatar name={candidate.name} />
                  <div>
                    <strong>{candidate.name}</strong>
                    <small>{candidate.appliedAgo ?? 'Imported candidate'}</small>
                  </div>
                </Link>
              )}
              {columns.includes('status') && <StatusCell candidate={candidate} stage={selectedStage} />}
              {columns.includes('contact') && <ContactCell candidate={candidate} />}
              {columns.includes('interview') && <InterviewCell candidate={candidate} />}
              {columns.includes('actions') && (
                <div className="row-actions">
                  <Link className="outline-button" to={`/projects/${projectId}/candidates/${candidate.id}`}>View</Link>
                  {showAddLog(role, selectedStage, candidate.status) && (
                    <Link className="dark-button" to={`/projects/${projectId}/candidates/${candidate.id}?modal=log-contact`}>
                      Add Log
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="empty-row table-empty">No candidates in this stage.</p>
        )}

        <footer className="figma-table-footer">
          <span>
            Showing {sortedCandidates.length} candidates in {stageLabels[selectedStage]} · {totalCandidates} total in project
          </span>
        </footer>
      </section>
    </div>
  )
}

function getStageCounts(candidates: Candidate[]) {
  const counts = Object.fromEntries(stageOrder.map((stage) => [stage, 0])) as Record<PipelineStage, number>
  candidates.forEach((candidate) => {
    counts[candidate.stage] += 1
  })
  return counts
}

function getStageColumns(role: 'hr' | 'hm', stage: PipelineStage): PipelineColumn[] {
  if (role === 'hm') {
    if (stage === 'department_interview' || stage === 'hr_interview') return ['candidate', 'status', 'interview', 'actions']
    return ['candidate', 'status', 'actions']
  }

  if (stage === 'department_interview' || stage === 'hr_interview') {
    return ['candidate', 'status', 'contact', 'interview', 'actions']
  }

  if (stage === 'offer_stage') return ['candidate', 'status', 'contact', 'actions']
  return ['candidate', 'status', 'actions']
}

function showAddLog(role: 'hr' | 'hm', stage: PipelineStage, status: CandidateStatus) {
  return role === 'hr' && stage !== 'offer_stage' && stage !== 'manager_review' && status !== 'rejected' && status !== 'withdrawn'
}

function sortCandidatePriority(left: Candidate, right: Candidate) {
  const priority = (status: CandidateStatus) => {
    if (status === 'waiting_for_contact') return 0
    if (status === 'not_reached') return 1
    if (status === 'withdrawn' || status === 'rejected') return 3
    return 2
  }

  return priority(left.status) - priority(right.status)
}

function StatusCell({ candidate, stage }: { candidate: Candidate; stage: PipelineStage }) {
  if (stage === 'manager_review' && candidate.status === 'waiting_for_contact') return <span className="muted-text">--</span>
  if (stage === 'pre_interview' && candidate.status === 'scheduled') return <span className="status-dot status-dot--scheduled"><i />Contact Successful</span>
  return <span className={`status-dot status-dot--${candidate.status}`}><i />{statusLabels[candidate.status]}</span>
}

function ContactCell({ candidate }: { candidate: Candidate }) {
  return (
    <Link className="contact-cell" to={`/projects/${candidate.projectId}/candidates/${candidate.id}?modal=contact-card`} aria-label={`Open contact info for ${candidate.name}`}>
      <Phone className="phone-icon" size={22} strokeWidth={1.8} />
    </Link>
  )
}

function InterviewCell({ candidate }: { candidate: Candidate }) {
  if (candidate.status === 'withdrawn') return <span className="muted-text">Terminated</span>
  if (!candidate.interview) return <span className="muted-text">--</span>
  return (
    <span className="interview-cell">
      <strong>{formatDate(candidate.interview.date)}</strong>
      <small>{formatTime(candidate.interview.date)}</small>
    </span>
  )
}

function CommentColumn({ title, items }: { title: string; items: Array<{ id: string; body: string }> }) {
  return (
    <section className="pre-interview-comment-card">
      <h3>{title}</h3>
      {items.length > 0 ? items.map((item) => <p key={item.id}>{item.body}</p>) : <p className="pre-interview-comment-empty">No comments yet.</p>}
    </section>
  )
}

function Avatar({ name }: { name: string }) {
  const initial = name.trim()[0]?.toUpperCase() ?? '?'
  return <span className={`avatar avatar-${initial.toLowerCase()}`}>{initial}</span>
}

function getOfferRankLabel(index: number) {
  if (index === 0) return 'First Candidate'
  if (index === 1) return 'Second Candidate'
  if (index === 2) return 'Third Candidate'
  return ''
}

function isPipelineStage(value: string | undefined): value is PipelineStage {
  return Boolean(value && stageOrder.includes(value as PipelineStage))
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(date)
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date)
}
