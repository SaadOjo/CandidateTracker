import { CalendarDays, ChevronDown, Copy, FileText, Link as LinkIcon, NotebookPen, Phone, RotateCcw, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { type AppOutletContext } from '../../components/layout/AppLayout'
import { EmptyState } from '../../components/ui/EmptyState'
import { stageLabels } from '../../domain/labels'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { candidateTrackerRepository } from '../../data/repository'
import type { Candidate, Note, Project } from '../../domain/types'
import { ContactCardModal } from './ContactCardModal'
import { LogContactAttemptModal } from './LogContactAttemptModal'
import { OfferListModal } from './OfferListModal'

export function CandidateDetailPage() {
  const { role, activeProfile } = useOutletContext<AppOutletContext>()
  const { projectId = '', candidateId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const [candidate, setCandidate] = useState<Candidate>()
  const [project, setProject] = useState<Project>()
  const [projectCandidates, setProjectCandidates] = useState<Candidate[]>([])
  const [savedNotes, setSavedNotes] = useState<Note[]>([])
  const [resumeOpen, setResumeOpen] = useState(false)

  useEffect(() => {
    candidateTrackerRepository.getCandidate(candidateId).then(setCandidate)
    setSavedNotes(readSavedNotes(candidateId))
  }, [candidateId])

  useEffect(() => {
    if (!projectId) return
    candidateTrackerRepository.listCandidates({ projectId }).then(setProjectCandidates)
    candidateTrackerRepository.getProject(projectId).then(setProject)
  }, [projectId])

  if (!candidate) return <EmptyState title="Candidate not found" />

  const source = searchParams.get('source')
  const closeTo = source === 'rejection'
    ? `/projects/${projectId}/candidates/${candidate.id}?source=rejection`
    : `/projects/${projectId}/candidates/${candidate.id}`

  return (
    <>
    <div className="candidate-detail-screen">
      <section className="candidate-detail-main">
        <div className="detail-title-row">
          <div>
            <h1>{candidate.name}</h1>
            {candidate.stage === 'pre_interview' && candidate.status === 'scheduled'
              ? <span className="status-badge status-badge--scheduled">Contact Successful</span>
              : <StatusBadge type="candidate" status={candidate.status} />}
          </div>
          <div className="profile-actions">
            <button className="profile-button linkedin"><LinkIcon size={16} /> LinkedIn</button>
            <button className="profile-button resume" onClick={() => setResumeOpen((open) => !open)}><FileText size={16} /> Resume</button>
          </div>
        </div>

        {resumeOpen && <InlineResume candidate={candidate} />}
        {project && candidate.stage === 'pre_interview' && <PreInterviewCommentsSection project={project} />}
        {candidate.status === 'scheduled' && candidate.interview && <ScheduledInterviewCard candidate={candidate} />}
        {[...candidate.notes, ...savedNotes].length > 0 && <InternalNotes notes={[...candidate.notes, ...savedNotes]} role={role} project={project} />}
        <ActivityHistory candidate={candidate} project={project} />
      </section>

      <aside className="candidate-detail-side">
        <QuickActions closeTo={closeTo} role={role} activeProfile={activeProfile} candidate={candidate} candidateId={candidateId} projectCandidates={projectCandidates} source={source} onSaveNote={(note) => {
          const next = [...savedNotes, note]
          setSavedNotes(next)
          writeSavedNotes(candidateId, next)
        }} />
      </aside>
    </div>
    {searchParams.get('modal') === 'contact-card' && <ContactCardModal candidate={candidate} closeTo={closeTo} />}
    {searchParams.get('modal') === 'log-contact' && <LogContactAttemptModal candidate={candidate} closeTo={closeTo} />}
    {searchParams.get('modal') === 'rejection-contact' && <LogContactAttemptModal candidate={candidate} closeTo={closeTo} kind="rejection" />}
    {searchParams.get('modal') === 'offer-list' && <OfferListModal candidate={candidate} closeTo={closeTo} />}
    </>
  )
}

function PreInterviewCommentsSection({ project }: { project: Project }) {
  const stored = readPreInterviewComments(project.id)
  const hmComments = stored?.hm ?? project.preInterviewComments?.hm ?? []
  const hrComments = stored?.hr ?? project.preInterviewComments?.hr ?? []
  if (hmComments.length === 0 && hrComments.length === 0) return null

  return (
    <section className="pre-interview-comments-panel pre-interview-comments-panel--detail">
      <div className="pre-interview-comments-grid">
        <CommentColumn title="HM Comments" items={hmComments} />
        <CommentColumn title="HR Comments" items={hrComments} />
      </div>
    </section>
  )
}

function InlineResume({ candidate }: { candidate: Candidate }) {
  return (
    <section className="inline-resume-card">
      <a className="inline-resume-download" href={candidate.resumeUrl ?? '#'} download>
        <FileText size={14} /> Download
      </a>
      <h3>{candidate.name}</h3>
      <small>{candidate.source} Candidate</small>
      <ul>
        <li>8+ years of relevant experience across product and cross-functional teams</li>
        <li>Strong communication, structured problem solving, and stakeholder collaboration</li>
        <li>Portfolio/resume prepared for demo preview in the candidate profile</li>
      </ul>
    </section>
  )
}

function ScheduledInterviewCard({ candidate }: { candidate: Candidate }) {
  const interview = candidate.interview
  if (!interview) return null

  return (
    <section className="scheduled-interview-card">
      <div className="scheduled-interview-icon"><CalendarDays size={18} /></div>
      <div className="scheduled-interview-copy">
        <strong>{interview.title}</strong>
        <p>{interview.date}</p>
        <p>{interview.time} · {interview.timezone}</p>
      </div>
      {interview.meetingUrl && <button className="copy-meeting-button" onClick={() => navigator.clipboard.writeText(interview.meetingUrl ?? '')}><Copy size={14} /> Copy Meeting URL</button>}
    </section>
  )
}

function InternalNotes({ notes, role, project }: { notes: Note[]; role: AppOutletContext['role']; project?: Project }) {
  const visibleNotes = notes.filter((note) => role === 'hr' || note.visibility !== 'hr_only')
  const orderedNotes = [...visibleNotes].sort((left, right) => parseNoteDate(right.createdAt) - parseNoteDate(left.createdAt))
  const [collapsedNotes, setCollapsedNotes] = useState<Record<string, boolean>>({})
  if (orderedNotes.length === 0) return null

  return (
    <section className="notes-section">
      <h2><i />Internal Notes</h2>
      <div className="notes-stack">
        {orderedNotes.map((note) => {
          const visibleFields = note.fields?.filter((field) => role === 'hr' || field.visibility !== 'hr_only') ?? []
          const collapsed = collapsedNotes[note.id] ?? true
          return <article className={`note-card ${collapsed ? 'note-card--collapsed' : ''}`} key={note.id}>
            <div className={`note-card-header ${collapsed ? 'note-card-header--collapsed' : ''}`}>
              <span>{formatNoteAuthor(note, project)}</span>
              <div className="note-card-meta">
                <time>{note.createdAt}</time>
                <button
                  className="note-card-toggle"
                  type="button"
                  aria-label={collapsed ? 'Expand note' : 'Collapse note'}
                  onClick={() => setCollapsedNotes((current) => ({ ...current, [note.id]: !collapsed }))}
                >
                  <ChevronDown className={collapsed ? '' : 'chevron-open'} size={16} />
                </button>
              </div>
            </div>
            {!collapsed && (visibleFields.length > 0
              ? <div className="note-form-view">{visibleFields.map((field) => <div className="note-form-row" key={`${note.id}-${field.question}`}><strong>{field.question}</strong><p>{field.answer}</p></div>)}</div>
              : note.body && <p>{note.body}</p>)}
          </article>
        })}
      </div>
    </section>
  )
}

function QuickActions({ closeTo, role, activeProfile, candidate, candidateId, projectCandidates, source, onSaveNote }: { closeTo: string; role: AppOutletContext['role']; activeProfile: AppOutletContext['activeProfile']; candidate: Candidate; candidateId: string; projectCandidates: Candidate[]; source: string | null; onSaveNote: (note: Note) => void }) {
  const hasOfferSentCandidate = projectCandidates.some((item) => item.stage === 'offer_stage' && item.status === 'offer_sent')
  const hasAcceptedOfferCandidate = projectCandidates.some((item) => item.stage === 'offer_stage' && item.status === 'offer_accepted')
  const [processOpen, setProcessOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [offerOpen, setOfferOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'reject' | null>(null)
  const [textNote, setTextNote] = useState('')
  const [formNote, setFormNote] = useState<Record<string, string>>({})
  const queryPrefix = closeTo.includes('?') ? '&' : '?'

  if (source !== 'rejection' && (candidate.status === 'rejected' || candidate.status === 'withdrawn' || candidate.status === 'offer_rejected')) return null

  const preInterviewProcessVisible = candidate.stage === 'pre_interview' && role === 'hr' && candidate.status === 'scheduled' && source !== 'rejection'

  return (
    <section className="quick-actions-card">
      <span className="eyebrow">QUICK ACTIONS</span>
      {(role === 'hr' || role === 'hm') && <div className="quick-action-group">
        <button onClick={() => setNoteOpen((open) => !open)}><NotebookPen size={16} /> Add Note <ChevronDown className={`push ${noteOpen ? 'chevron-open' : ''}`} size={16} /></button>
        {noteOpen && <div className="quick-note-box">
          {role === 'hr' && (candidate.stage === 'hr_interview' || candidate.stage === 'pre_interview')
            ? <HrInterviewNoteForm stage={candidate.stage} values={formNote} onChange={setFormNote} />
            : <textarea value={textNote} onChange={(event) => setTextNote(event.target.value)} placeholder="Type your note here..." />}
          <div className="quick-note-actions">
            <button className="quick-note-save" onClick={() => {
              const note = buildNote(role, activeProfile, candidate.stage, candidateId, textNote, formNote)
              if (!note) return
              onSaveNote(note)
              setTextNote('')
              setFormNote({})
              setNoteOpen(false)
            }}>Save</button>
            <button className="quick-note-cancel" onClick={() => { setNoteOpen(false); setTextNote(''); setFormNote({}) }}>Cancel</button>
          </div>
        </div>}
      </div>}
      {role === 'hr' && candidate.stage === 'pre_interview' && candidate.status !== 'scheduled' && source !== 'rejection' && <Link to={`${closeTo}${queryPrefix}modal=log-contact`}><RotateCcw size={16} /> Add Log</Link>}
      {preInterviewProcessVisible && <div className="quick-action-group">
        <button onClick={() => setProcessOpen((open) => !open)}><Search size={16} /> Process <ChevronDown className={`push ${processOpen ? 'chevron-open' : ''}`} size={16} /></button>
        {processOpen && <div className="quick-action-menu">
          <button>Move to Department Interview Stage</button>
          <button className="quick-action-danger" onClick={() => setConfirmAction('reject')}>Reject</button>
        </div>}
      </div>}
      {role === 'hr' && candidate.stage !== 'pre_interview' && candidate.stage !== 'manager_review' && source !== 'rejection' && <Link to={`${closeTo}${queryPrefix}modal=contact-card`}><Phone size={16} /> Contact Info</Link>}
      {role === 'hr' && candidate.stage !== 'pre_interview' && candidate.stage !== 'manager_review' && source !== 'rejection' && candidate.stage !== 'offer_stage' && <Link to={`${closeTo}${queryPrefix}modal=log-contact`}><RotateCcw size={16} /> Log Contact Attempt</Link>}
      {role === 'hr' && source === 'rejection' && <Link to={`${closeTo}${queryPrefix}modal=rejection-contact`}><RotateCcw size={16} /> Rejection Handling</Link>}
      {role === 'hm' && candidate.stage === 'department_interview' && candidate.status === 'scheduled' && source !== 'rejection' && (
        <div className="quick-action-group">
          <button onClick={() => setProcessOpen((open) => !open)}><Search size={16} /> Process <ChevronDown className={`push ${processOpen ? 'chevron-open' : ''}`} size={16} /></button>
          {processOpen && <div className="quick-action-menu">
            <button>Move to HR Stage</button>
            <button className="quick-action-danger" onClick={() => setConfirmAction('reject')}>Reject</button>
          </div>}
        </div>
      )}
      {(role === 'hm' || role === 'hr') && candidate.stage === 'manager_review' && (
        <div className="quick-action-group">
          <button onClick={() => setProcessOpen((open) => !open)}><Search size={16} /> Process <ChevronDown className={`push ${processOpen ? 'chevron-open' : ''}`} size={16} /></button>
          {processOpen && <div className="quick-action-menu">
            <Link to={`${closeTo}${queryPrefix}modal=offer-list`}>Approve for Offer</Link>
            {candidate.status !== 'waitlisted' && <button>Waitlist</button>}
            <button className="quick-action-danger" onClick={() => setConfirmAction('reject')}>Reject</button>
          </div>}
        </div>
      )}
      {(role === 'hm' || role === 'hr') && candidate.stage === 'offer_stage' && candidate.status === 'approved_for_offer' && source !== 'rejection' && !hasAcceptedOfferCandidate && (
        <div className="quick-action-group">
          <button onClick={() => setProcessOpen((open) => !open)}><Search size={16} /> Process <ChevronDown className={`push ${processOpen ? 'chevron-open' : ''}`} size={16} /></button>
          {processOpen && <div className="quick-action-menu">
            <Link to={`${closeTo}${queryPrefix}modal=offer-list`}>Offer List</Link>
          </div>}
        </div>
      )}
      {role === 'hr' && candidate.stage === 'hr_interview' && candidate.status !== 'rejected' && candidate.status !== 'withdrawn' && source !== 'rejection' && (
        <div className="quick-action-group">
          <button onClick={() => setProcessOpen((open) => !open)}><Search size={16} /> Process <ChevronDown className={`push ${processOpen ? 'chevron-open' : ''}`} size={16} /></button>
          {processOpen && <div className="quick-action-menu">
            {candidate.status === 'assessment_sent'
              ? <>
                  <button>Move to Candidate Review</button>
                  <button className="quick-action-danger" onClick={() => setConfirmAction('reject')}>Reject</button>
                </>
              : <>
                  <button className="quick-action-danger" onClick={() => setConfirmAction('reject')}>Reject</button>
                  <button>Send Assessment</button>
                </>}
          </div>}
        </div>
      )}
      {role === 'hr' && candidate.stage === 'offer_stage' && source !== 'rejection' && !hasAcceptedOfferCandidate && (!hasOfferSentCandidate || candidate.status !== 'approved_for_offer') && (
        <div className="quick-action-group">
          <button onClick={() => setOfferOpen((open) => !open)}><Search size={16} /> Offer Handling <ChevronDown className={`push ${offerOpen ? 'chevron-open' : ''}`} size={16} /></button>
          {offerOpen && <div className="quick-action-menu">
            {candidate.status === 'approved_for_offer' && <button>Send Offer</button>}
            {candidate.status === 'offer_sent' && <><button className="quick-action-accent">Offer Accepted</button><button className="quick-action-danger" onClick={() => setConfirmAction('reject')}>Offer Rejected</button></>}
            {candidate.status === 'offer_rejected' && <button>Offer Rejected</button>}
            {candidate.status === 'offer_accepted' && <button>Offer Accepted</button>}
          </div>}
        </div>
      )}
      {confirmAction && <>
        <div className="pipeline-confirmation-backdrop" onClick={() => setConfirmAction(null)} />
        <div className="confirmation-popover confirmation-popover--quick-action">
          <h3>Are you sure?</h3>
          <p><strong>{candidate.name}</strong> · {stageLabels[candidate.stage]}</p>
          <p>This candidate will be rejected from the process.</p>
          <div className="confirmation-popover-actions">
            <button onClick={() => setConfirmAction(null)}>Cancel</button>
            <button className="confirmation-approve" onClick={() => setConfirmAction(null)}>Confirm</button>
          </div>
        </div>
      </>}
    </section>
  )
}

function HrInterviewNoteForm({ stage, values, onChange }: { stage: Candidate['stage']; values: Record<string, string>; onChange: (next: Record<string, string>) => void }) {
  const questions = stage === 'pre_interview'
    ? [
        'Why is the candidate interested in this role?',
        'How clear and professional was the communication?',
        'What is the expected wage?',
        'Is notice period / availability suitable?',
        'Did the candidate sound motivated to continue?',
      ]
    : [
        'Why is the candidate interested in this role?',
        'How clear and professional was the communication?',
        'What is the expected wage?',
        'Is notice period / availability suitable?',
        'Did the candidate show strong motivation and stability?',
      ]

  return (
    <div className="hr-note-form">
      {questions.map((question) => (
        <label key={question}>
          <span>{question}</span>
          <textarea value={values[question] ?? ''} onChange={(event) => onChange({ ...values, [question]: event.target.value })} placeholder="Add your notes..." />
        </label>
      ))}
      <label>
        <span>General Notes</span>
        <textarea value={values['General Notes'] ?? ''} onChange={(event) => onChange({ ...values, 'General Notes': event.target.value })} placeholder="Add any additional notes..." />
      </label>
    </div>
  )
}

function CommentColumn({ title, items }: { title: string; items: string[] }) {
  return <section className="pre-interview-comment-card"><h3>{title}</h3>{items.length > 0 ? items.map((item, index) => <p key={`${title}-${index}`}>{item}</p>) : <p className="pre-interview-comment-empty">No comments yet.</p>}</section>
}

function buildNote(role: AppOutletContext['role'], activeProfile: AppOutletContext['activeProfile'], stage: Candidate['stage'], candidateId: string, textNote: string, formNote: Record<string, string>): Note | null {
  const createdAt = new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' •')
  if (role === 'hr' && (stage === 'hr_interview' || stage === 'pre_interview')) {
    const fields = Object.entries(formNote)
      .filter(([, answer]) => answer.trim())
      .map(([question, answer]) => ({ question, answer: answer.trim(), visibility: question === 'What is the expected wage?' ? 'hr_only' as const : 'all' as const }))
    if (fields.length === 0) return null
    return { id: `saved-${candidateId}-${Date.now()}`, author: 'HR Manager', authorName: activeProfile.name, createdAt, fields }
  }
  if (!textNote.trim()) return null
  return { id: `saved-${candidateId}-${Date.now()}`, author: role === 'hr' ? 'HR Manager' : 'Hiring Manager', authorName: activeProfile.name, createdAt, body: textNote.trim() }
}

function parseNoteDate(value: string) {
  const normalized = value.replace('•', '').replace(/\s+/g, ' ').trim()
  const timestamp = Date.parse(normalized)
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function formatNoteAuthor(note: Note, project?: Project) {
  if (note.authorName) return `${note.author} · ${note.authorName}`
  if (note.author === 'Hiring Manager') return `${note.author} · ${project?.hiringManager ?? '—'}`
  if (note.author === 'HR Manager') return `${note.author} · ${project?.assignedHr?.[0] ?? '—'}`
  return note.author
}

function readSavedNotes(candidateId: string) {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(`candidate-notes:${candidateId}`)
  return raw ? JSON.parse(raw) as Note[] : []
}

function writeSavedNotes(candidateId: string, notes: Note[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(`candidate-notes:${candidateId}`, JSON.stringify(notes))
}

function getActivitySubtitle(item: Candidate['activity'][number], candidate: Candidate, project?: Project) {
  const owner = getActivityExplanation(item.title, candidate, project)
  if (!item.subtitle) return owner
  if (item.subtitle.toLowerCase().includes('contact attempt')) return `${item.subtitle} · ${owner}`
  return item.subtitle
}

function getActivityExplanation(title: string, candidate: Candidate, project?: Project) {
  const hiringManager = project?.hiringManager ?? '—'
  const hrManager = project?.assignedHr?.[0] ?? '—'

  switch (title) {
    case 'Profile Imported':
      return 'Source: LinkedIn Recruiter'
    case 'Pre-Interview Conducted Successfully':
    case 'Contact Successful':
      return `HR Manager - ${hrManager}`
    case 'Pre-Interview Not Conducted':
      return `HR Manager - ${hrManager}`
    case 'Department Interview Scheduled':
      return `Scheduled by HR Manager - ${hrManager}`
    case 'Department Interview':
      return `Hiring Manager - ${hiringManager}`
    case 'HR Interview Scheduled':
      return `Scheduled by HR Manager - ${hrManager}`
    case 'HR Interview':
      return `HR Manager - ${hrManager}`
    case 'Assessment Sent':
      return `Sent by HR Manager - ${hrManager}`
    case 'Waiting for Assessment':
      return `Tracked by HR Manager - ${hrManager}`
    case 'Waitlisted by Hiring Manager':
      return `Hiring Manager - ${hiringManager}`
    case 'Approved for Offer':
      return `Approved for offer by Hiring Manager - ${hiringManager}`
    case 'Offer Sent':
      return `Sent by HR Manager - ${hrManager}`
    case 'Offer Accepted':
      return `Processed by HR Manager - ${hrManager}`
    case 'Offer Rejected':
      return `Processed by HR Manager - ${hrManager}`
    case 'Rejected by Hiring Manager':
      return `Hiring Manager - ${hiringManager}`
    case 'Rejected by HR Manager':
      return `HR Manager - ${hrManager}`
    case 'Candidate Informed':
      return `HR Manager - ${hrManager}`
    case 'Proceeded with another candidate.':
      return `Hiring Manager - ${hiringManager}`
    case 'Withdrawn':
      return 'Candidate withdrew from process'
    case 'Not Reached':
      return `HR Manager - ${hrManager}`
    default:
      return candidate.stage === 'offer_stage' ? `HR Manager - ${hrManager}` : ''
  }
}

function readPreInterviewComments(projectId: string) {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(`pre-interview-comments:${projectId}`)
  return raw ? JSON.parse(raw) as { hm: string[]; hr: string[] } : null
}

function ActivityHistory({ candidate, project }: { candidate: Candidate; project?: Project }) {
  const visible = [...candidate.activity].reverse()
  return (
    <section className="activity-section">
      <h2><i />Activity History</h2>
      <ol className="figma-activity-list">
        {visible.map((item) => {
          const subtitle = getActivitySubtitle(item, candidate, project)
          return <li key={item.id}>
            <span className="activity-index">{item.index}</span>
            <div><strong className={`${item.tone ?? ''} activity-title-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.trim()}>{item.title}</strong>{subtitle && <small>{subtitle}</small>}</div>
            <time>{item.date ?? item.title}</time>
          </li>
        })}
      </ol>
    </section>
  )
}
