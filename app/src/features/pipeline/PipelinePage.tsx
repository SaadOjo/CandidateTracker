import { Phone, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { type AppOutletContext } from '../../components/layout/AppLayout'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { candidateTrackerRepository } from '../../data/repository'
import { stageLabels, stageOrder, statusLabels } from '../../domain/labels'
import type { Candidate, CandidateStatus, PipelineStage, Project } from '../../domain/types'
import { ContactCardModal } from '../candidates/ContactCardModal'
import { LogContactAttemptModal } from '../candidates/LogContactAttemptModal'

export function PipelinePage() {
  const { role } = useOutletContext<AppOutletContext>()
  const { projectId = '', stage = 'department_interview' } = useParams()
  const [searchParams] = useSearchParams()
  const selectedStage = stage as PipelineStage
  const [project, setProject] = useState<Project>()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    candidateTrackerRepository.getProject(projectId).then(setProject)
  }, [projectId])

  useEffect(() => {
    candidateTrackerRepository.listCandidates({ projectId, stage: selectedStage, query }).then(setCandidates)
  }, [projectId, selectedStage, query])

  const modalCandidateId = searchParams.get('candidateId')
  const modalCandidate = candidates.find((candidate) => candidate.id === modalCandidateId)
  const closeTo = `/projects/${projectId}/pipeline/${selectedStage}`

  const columns = getStageColumns(role, selectedStage)

  return (
    <>
    <div className="pipeline-screen">
      <section className="pipeline-title-block">
        <div className="title-line"><h1>Project Pipeline</h1><StatusBadge type="project" status="active" /></div>
        <h2>{project?.name ?? 'Senior Product Designer Hiring'}</h2>
        <p>Position: {project?.position ?? 'Senior Product Designer'}</p>
      </section>

      <div className="search-input candidate-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search candidate name..." /></div>

      <nav className="figma-stage-tabs">
        {stageOrder.map((item) => (
          <Link className={item === selectedStage ? 'active' : ''} key={item} to={`/projects/${projectId}/pipeline/${item}`}>
            {stageLabels[item]}
          </Link>
        ))}
      </nav>

      <section className="figma-table-card">
        <div className={`figma-table-row figma-table-header figma-table-row--${selectedStage} figma-table-row--role-${role}`}>
          {columns.includes('candidate') && <span className="column-header">Candidate Name</span>}
          {columns.includes('status') && <span className="column-header">Status</span>}
          {columns.includes('contact') && <span className="column-header contact-column-header">Contact</span>}
          {columns.includes('interview') && <span className="column-header">Interview Info</span>}
          {columns.includes('actions') && <span className="column-header">Actions</span>}
        </div>

        {candidates.map((candidate, index) => (
          <div className={`figma-table-row figma-table-row--${selectedStage} figma-table-row--role-${role}`} key={candidate.id}>
            {columns.includes('candidate') && <Link className="candidate-cell candidate-cell-link" to={`/projects/${projectId}/candidates/${candidate.id}`}>
              <Avatar name={candidate.name} />
              <div>
                {selectedStage === 'offer_stage' && getOfferRankLabel(index) && <small className="offer-rank-label">{getOfferRankLabel(index)}</small>}
                <strong>{candidate.name.replace('.', '')}</strong><small>{candidate.appliedAgo}</small>
              </div>
            </Link>}
            {columns.includes('status') && <StatusDot status={candidate.status} />}
            {columns.includes('contact') && renderContactCell(selectedStage, closeTo, candidate, index)}
            {columns.includes('interview') && <InterviewCell candidate={candidate} />}
            {columns.includes('actions') && <div className="row-actions">
              <Link className="outline-button" to={`/projects/${projectId}/candidates/${candidate.id}`}>View</Link>
              {showAddLog(role, selectedStage, candidate.status) && <Link className="dark-button" to={`${closeTo}?modal=log-contact&candidateId=${candidate.id}`}>Add Log</Link>}
            </div>}
          </div>
        ))}

        <footer className="figma-table-footer"><span>Showing {candidates.length} of {project?.candidateCount ?? 42} candidates</span><span className="pager">‹ <b>1</b> 2 3 ›</span></footer>
      </section>
    </div>
    {searchParams.get('modal') === 'contact-card' && modalCandidate && <ContactCardModal candidate={modalCandidate} closeTo={closeTo} />}
    {searchParams.get('modal') === 'log-contact' && modalCandidate && <LogContactAttemptModal candidate={modalCandidate} closeTo={closeTo} />}
    </>
  )
}

type PipelineColumn = 'candidate' | 'status' | 'contact' | 'interview' | 'actions'

function getStageColumns(role: AppOutletContext['role'], stage: PipelineStage): PipelineColumn[] {
  if (role === 'hm') {
    return ['candidate', 'status', 'actions']
  }

  if (stage === 'manager_review') return ['candidate', 'status']
  if (stage === 'offer_stage') return ['candidate', 'status', 'contact', 'actions']
  return ['candidate', 'status', 'contact', 'interview', 'actions']
}

function showAddLog(role: AppOutletContext['role'], stage: PipelineStage, status: CandidateStatus) {
  return role === 'hr' && stage !== 'offer_stage' && status !== 'rejected' && status !== 'withdrawn'
}

function getOfferRankLabel(index: number) {
  if (index === 0) return 'First Candidate'
  if (index === 1) return 'Second Candidate'
  if (index === 2) return 'Third Candidate'
  return ''
}

function renderContactCell(stage: PipelineStage, closeTo: string, candidate: Candidate, index: number) {
  if (stage === 'offer_stage' && index > 0) return <span className="contact-cell contact-cell--empty" aria-hidden="true" />
  return <Link className="contact-cell" to={`${closeTo}?modal=contact-card&candidateId=${candidate.id}`} aria-label={`Open contact info for ${candidate.name.replace('.', '')}`}><Phone className="phone-icon" size={22} strokeWidth={1.8} /></Link>
}

function InterviewCell({ candidate }: { candidate: Candidate }) {
  if (candidate.status === 'withdrawn') return <span className="muted-text">Terminated</span>
  if (!candidate.interview) return <span className="muted-text">--</span>
  return <span className="interview-cell"><strong>Apr 15</strong><small>02:00 PM</small></span>
}

function StatusDot({ status }: { status: CandidateStatus }) {
  return <span className={`status-dot status-dot--${status}`}><i />{statusLabels[status]}</span>
}

function Avatar({ name }: { name: string }) {
  const initial = name.trim()[0]
  return <span className={`avatar avatar-${initial.toLowerCase()}`}>{initial}</span>
}
