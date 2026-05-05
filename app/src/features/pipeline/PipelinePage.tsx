import { Phone, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { candidateTrackerRepository } from '../../data/repository'
import { stageLabels, stageOrder, statusLabels } from '../../domain/labels'
import type { Candidate, CandidateStatus, PipelineStage, Project } from '../../domain/types'
import { LogContactAttemptModal } from '../candidates/LogContactAttemptModal'

export function PipelinePage() {
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
        {stageOrder.map((item, index) => (
          <Link className={item === selectedStage ? 'active' : ''} key={item} to={`/projects/${projectId}/pipeline/${item}`}>
            {index + 1}. {item === 'department_interview' ? 'Department Interview' : stageLabels[item]}
          </Link>
        ))}
      </nav>

      <section className="figma-table-card">
        <div className="figma-table-row figma-table-header">
          <span>Candidate Name</span>
          <span>Status</span>
          <span className="contact-column-header">Contact</span>
          <span>Interview Info</span>
          <span>Actions</span>
        </div>

        {candidates.map((candidate) => (
          <div className="figma-table-row" key={candidate.id}>
            <div className="candidate-cell">
              <Avatar name={candidate.name} />
              <div><strong>{candidate.name.replace('.', '')}</strong><small>{candidate.appliedAgo}</small></div>
            </div>
            <StatusDot status={candidate.status} />
            <div className="contact-cell"><Phone className="phone-icon" size={22} strokeWidth={1.8} /></div>
            <InterviewCell candidate={candidate} />
            <div className="row-actions">
              <Link className="outline-button" to={`/projects/${projectId}/candidates/${candidate.id}`}>View</Link>
              {candidate.status !== 'rejected' && candidate.status !== 'withdrawn' && <Link className="dark-button" to={`${closeTo}?modal=log-contact&candidateId=${candidate.id}`}>Add Log</Link>}
            </div>
          </div>
        ))}

        <footer className="figma-table-footer"><span>Showing {candidates.length} of {project?.candidateCount ?? 42} candidates</span><span className="pager">‹ <b>1</b> 2 3 ›</span></footer>
      </section>
    </div>
    {searchParams.get('modal') === 'log-contact' && <LogContactAttemptModal candidate={modalCandidate} closeTo={closeTo} />}
    </>
  )
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
