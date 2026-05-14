import { Phone, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { type AppOutletContext } from '../../components/layout/AppLayout'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { candidateTrackerRepository } from '../../data/repository'
import { stageLabels, stageOrder, statusLabels } from '../../domain/labels'
import type { Candidate, CandidateStatus, PipelineStage, Project } from '../../domain/types'
import { ContactCardModal } from '../candidates/ContactCardModal'
import { LogContactAttemptModal } from '../candidates/LogContactAttemptModal'

export function PipelinePage() {
  const { role } = useOutletContext<AppOutletContext>()
  const { projectId = '', stage = 'pre_interview' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const selectedStage = stage as PipelineStage
  const [project, setProject] = useState<Project>()
  const [allProjectCandidates, setAllProjectCandidates] = useState<Candidate[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [query, setQuery] = useState('')
  const [hmComments, setHmComments] = useState<string[]>([])
  const [hrComments, setHrComments] = useState<string[]>([])
  const [draggedOfferCandidate, setDraggedOfferCandidate] = useState<Candidate | null>(null)
  const [offerPreviewIds, setOfferPreviewIds] = useState<string[] | null>(null)
  const [offerReorderConfirmOpen, setOfferReorderConfirmOpen] = useState(false)

  useEffect(() => {
    candidateTrackerRepository.getProject(projectId).then((item) => {
      setProject(item)
      const stored = readPreInterviewComments(projectId)
      setHmComments(stored?.hm ?? item?.preInterviewComments?.hm ?? [])
      setHrComments(stored?.hr ?? item?.preInterviewComments?.hr ?? [])
    })
  }, [projectId])

  useEffect(() => {
    candidateTrackerRepository.listCandidates({ projectId, stage: selectedStage, query }).then(setCandidates)
  }, [projectId, selectedStage, query])

  useEffect(() => {
    candidateTrackerRepository.listCandidates({ projectId }).then(setAllProjectCandidates)
  }, [projectId])

  const modalCandidateId = searchParams.get('candidateId')
  const modalCandidate = candidates.find((candidate) => candidate.id === modalCandidateId)
  const closeTo = `/projects/${projectId}/pipeline/${selectedStage}`

  const columns = getStageColumns(role, selectedStage)
  const sortedCandidates = [...candidates].sort((left, right) => {
    const getPriority = (status: Candidate['status']) => {
      if (status === 'waiting_for_contact') return 0
      if (status === 'not_reached') return 1
      if (status === 'withdrawn' || status === 'rejected') return 3
      return 2
    }

    return getPriority(left.status) - getPriority(right.status)
  })

  const visibleCandidates = selectedStage === 'offer_stage' && offerPreviewIds
    ? offerPreviewIds
        .map((id) => sortedCandidates.find((candidate) => candidate.id === id))
        .filter((candidate): candidate is Candidate => Boolean(candidate))
    : sortedCandidates

  return (
    <>
    <div className="pipeline-screen">
      <section className="pipeline-title-block">
        <div className="pipeline-title-header">
          <div>
            <div className="title-line"><h1>Project Pipeline</h1><StatusBadge type="project" status={allProjectCandidates.some((candidate) => candidate.status === 'offer_accepted') && project?.status === 'active' ? 'candidate_accepted' : project?.status ?? 'active'} /></div>
            <h2>{project?.name ?? 'Senior Product Designer Hiring'}</h2>
            <p>Position: {project?.position ?? 'Senior Product Designer'}</p>
            {project?.notes && <small className="pipeline-project-note">{project.notes}</small>}
          </div>
          <div className="project-date-block">
            {project?.createdAt && <div><span>Created</span><strong>{project.createdAt}</strong></div>}
            {project?.archivedAt && <div><span>Archived</span><strong>{project.archivedAt}</strong></div>}
          </div>
        </div>
      </section>

      <div className="pipeline-search-row">
        <div className="search-input candidate-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search candidate name..." /></div>
      </div>

      <nav className="figma-stage-tabs">
        {stageOrder.map((item) => (
          <Link className={item === selectedStage ? 'active' : ''} key={item} to={`/projects/${projectId}/pipeline/${item}`}>
            {stageLabels[item]}
          </Link>
        ))}
      </nav>

      {selectedStage === 'pre_interview' && <section className="pre-interview-comments-panel">
        <div className="pre-interview-comments-actions">
          {role === 'hm' && <button className="dark-button" onClick={() => navigate(`${closeTo}?modal=hm-comments`)}>HM Comments</button>}
          {role === 'hr' && <button className="dark-button" onClick={() => navigate(`${closeTo}?modal=hr-comments`)}>HR Comments</button>}
        </div>
      </section>}

      <section className="figma-table-card">
        <div className={`figma-table-row figma-table-header figma-table-row--${selectedStage} figma-table-row--role-${role}`}>
          {columns.includes('candidate') && <span className="column-header">Candidate Name</span>}
          {columns.includes('status') && <span className="column-header">Status</span>}
          {columns.includes('contact') && <span className="column-header contact-column-header">Contact</span>}
          {columns.includes('interview') && <span className="column-header">Interview Info</span>}
          {columns.includes('actions') && <span className="column-header">Actions</span>}
        </div>

        {visibleCandidates.map((candidate, index) => (
          <div
            className={`figma-table-row figma-table-row--${selectedStage} figma-table-row--role-${role} ${draggedOfferCandidate?.id === candidate.id ? 'figma-table-row--dragging' : ''}`}
            key={candidate.id}
            onDragOver={(event) => {
              if (!draggedOfferCandidate || !showOfferReorder(role, selectedStage, candidate.status)) return
              event.preventDefault()
              setOfferPreviewIds((current) => {
                const base = current ?? visibleCandidates.map((item) => item.id)
                const fromIndex = base.indexOf(draggedOfferCandidate.id)
                const toIndex = base.indexOf(candidate.id)
                if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return base
                const next = [...base]
                const [moved] = next.splice(fromIndex, 1)
                next.splice(toIndex, 0, moved)
                return next
              })
            }}
          >
            {columns.includes('candidate') && <Link className="candidate-cell candidate-cell-link" to={`/projects/${projectId}/candidates/${candidate.id}`} draggable={false}>
              {showOfferReorder(role, selectedStage, candidate.status) && <span
                className="order-handle order-handle--inline"
                aria-hidden="true"
                draggable
                onClick={(event) => event.preventDefault()}
                onDragStart={(event) => {
                  event.stopPropagation()
                  setDraggedOfferCandidate(candidate)
                  setOfferPreviewIds(visibleCandidates.map((item) => item.id))
                }}
                onDragEnd={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setDraggedOfferCandidate(candidate)
                  setOfferReorderConfirmOpen(true)
                }}
              >≡</span>}
              <Avatar name={candidate.name} />
              <div>
                {selectedStage === 'offer_stage' && getOfferRankLabel(index) && <small className="offer-rank-label">{getOfferRankLabel(index)}</small>}
                <strong>{candidate.name.replace('.', '')}</strong><small>{candidate.appliedAgo}</small>
              </div>
            </Link>}
            {columns.includes('status') && <StatusCell candidate={candidate} stage={selectedStage} />}
            {columns.includes('contact') && renderContactCell(selectedStage, closeTo, candidate, index)}
            {columns.includes('interview') && <InterviewCell candidate={candidate} />}
            {columns.includes('actions') && <div className="row-actions">
              <Link className="outline-button" to={`/projects/${projectId}/candidates/${candidate.id}`}>View</Link>
              {showAddLog(role, selectedStage, candidate.status) && <Link className="dark-button" to={`${closeTo}?modal=log-contact&candidateId=${candidate.id}`}>Add Log</Link>}
            </div>}
          </div>
        ))}

        <footer className="figma-table-footer"><span>Showing {visibleCandidates.length} of {project?.candidateCount ?? visibleCandidates.length} candidates</span></footer>
        {offerReorderConfirmOpen && draggedOfferCandidate && <>
          <div className="pipeline-confirmation-backdrop" onClick={() => { setOfferReorderConfirmOpen(false); setDraggedOfferCandidate(null); setOfferPreviewIds(null) }} />
          <div className="confirmation-popover confirmation-popover--pipeline-offer-reorder">
            <h3>Save offer list order?</h3>
            <p>{draggedOfferCandidate.name} was moved in the offer list. Are you sure you want to continue?</p>
            <div className="confirmation-popover-actions">
              <button onClick={() => { setOfferReorderConfirmOpen(false); setDraggedOfferCandidate(null); setOfferPreviewIds(null) }}>Cancel</button>
              <button className="confirmation-approve" onClick={() => { setOfferReorderConfirmOpen(false); setDraggedOfferCandidate(null); setOfferPreviewIds(null) }}>Confirm</button>
            </div>
          </div>
        </>}
      </section>

    </div>
    {searchParams.get('modal') === 'contact-card' && modalCandidate && <ContactCardModal candidate={modalCandidate} closeTo={closeTo} />}
    {searchParams.get('modal') === 'log-contact' && modalCandidate && <LogContactAttemptModal candidate={modalCandidate} closeTo={closeTo} />}
    {searchParams.get('modal') === 'hm-comments' && <BasicCommentModal title="HM Comments" closeTo={closeTo} initialValue={hmComments.join('\n\n')} onSave={(value) => updatePreInterviewComments(projectId, 'hm', value, setHmComments, setHrComments, hrComments)} />}
    {searchParams.get('modal') === 'hr-comments' && <BasicCommentModal title="HR Comments" closeTo={closeTo} initialValue={hrComments.join('\n\n')} onSave={(value) => updatePreInterviewComments(projectId, 'hr', value, setHrComments, setHmComments, hmComments)} />}
    </>
  )
}

type PipelineColumn = 'candidate' | 'status' | 'contact' | 'interview' | 'actions'

function getStageColumns(role: AppOutletContext['role'], stage: PipelineStage): PipelineColumn[] {
  if (role === 'hm') {
    if (stage === 'pre_interview') return ['candidate', 'status', 'actions']
    if (stage === 'manager_review') return ['candidate', 'status', 'actions']
    if (stage === 'offer_stage') return ['candidate', 'status', 'actions']
    return ['candidate', 'status', 'interview', 'actions']
  }

  if (stage === 'pre_interview') return ['candidate', 'status', 'actions']
  if (stage === 'manager_review') return ['candidate', 'status', 'actions']
  if (stage === 'offer_stage') return ['candidate', 'status', 'actions']
  return ['candidate', 'status', 'contact', 'interview', 'actions']
}

function showAddLog(role: AppOutletContext['role'], stage: PipelineStage, status: CandidateStatus) {
  return role === 'hr' && stage !== 'offer_stage' && stage !== 'manager_review' && status !== 'rejected' && status !== 'withdrawn'
}

function showOfferReorder(role: AppOutletContext['role'], stage: PipelineStage, status: CandidateStatus) {
  return (role === 'hm' || role === 'hr') && stage === 'offer_stage' && status === 'approved_for_offer'
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

function StatusCell({ candidate, stage }: { candidate: Candidate; stage: PipelineStage }) {
  if (stage === 'manager_review' && candidate.status === 'waiting_for_contact') return <span className="muted-text">--</span>
  if (stage === 'pre_interview' && candidate.status === 'scheduled') return <span className="status-dot status-dot--scheduled"><i />Contact Successful</span>
  return <StatusDot status={candidate.status} />
}

function InterviewCell({ candidate }: { candidate: Candidate }) {
  if (candidate.status === 'withdrawn') return <span className="muted-text">Terminated</span>
  if (!candidate.interview) return <span className="muted-text">--</span>

  const shortDate = candidate.interview.date.replace(/^\w+,\s*/, '')
  const shortTime = candidate.interview.time.split('—')[0].trim()

  return <span className="interview-cell"><strong>{shortDate}</strong><small>{shortTime}</small></span>
}

function StatusDot({ status }: { status: CandidateStatus }) {
  return <span className={`status-dot status-dot--${status}`}><i />{statusLabels[status]}</span>
}

function Avatar({ name }: { name: string }) {
  const initial = name.trim()[0]
  return <span className={`avatar avatar-${initial.toLowerCase()}`}>{initial}</span>
}

function BasicCommentModal({ title, closeTo, initialValue, onSave }: { title: string; closeTo: string; initialValue: string; onSave: (value: string) => void }) {
  const navigate = useNavigate()
  const [value, setValue] = useState(initialValue)

  return (
    <div className="modal-backdrop" role="presentation">
      <Link className="modal-scrim-link" to={closeTo} aria-label="Close modal" />
      <section className="modal-surface basic-comment-surface" role="dialog" aria-modal="true" aria-labelledby="basic-comment-title">
        <div className="basic-comment-modal">
          <h1 id="basic-comment-title">{title}</h1>
          <textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder="Type your comment here..." />
          <div className="basic-comment-actions">
            <button onClick={() => navigate(closeTo)}>Cancel</button>
            <button className="confirmation-approve" onClick={() => { if (!value.trim()) return; onSave(value.trim()); navigate(closeTo) }}>Save</button>
          </div>
        </div>
      </section>
    </div>
  )
}

function readPreInterviewComments(projectId: string) {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(`pre-interview-comments:${projectId}`)
  return raw ? JSON.parse(raw) as { hm: string[]; hr: string[] } : null
}

function updatePreInterviewComments(
  projectId: string,
  kind: 'hm' | 'hr',
  value: string,
  setter: (items: string[]) => void,
  otherSetter: (items: string[]) => void,
  other: string[],
) {
  const next = value.split(/\n+/).map((item) => item.trim()).filter(Boolean)
  setter(next)
  otherSetter(other)
  if (typeof window === 'undefined') return
  const payload = kind === 'hm' ? { hm: next, hr: other } : { hm: other, hr: next }
  window.localStorage.setItem(`pre-interview-comments:${projectId}`, JSON.stringify(payload))
}
