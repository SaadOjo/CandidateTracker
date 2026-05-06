import { CalendarDays, ChevronDown, Copy, FileText, Link as LinkIcon, NotebookPen, Phone, RotateCcw, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { type AppOutletContext } from '../../components/layout/AppLayout'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { candidateTrackerRepository } from '../../data/repository'
import type { Candidate } from '../../domain/types'
import { ContactCardModal } from './ContactCardModal'
import { LogContactAttemptModal } from './LogContactAttemptModal'

export function CandidateDetailPage() {
  const { role } = useOutletContext<AppOutletContext>()
  const { projectId = '', candidateId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const [candidate, setCandidate] = useState<Candidate>()

  useEffect(() => {
    candidateTrackerRepository.getCandidate(candidateId).then(setCandidate)
  }, [candidateId])

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
            <StatusBadge type="candidate" status={candidate.status} />
          </div>
          <div className="profile-actions">
            <button className="profile-button linkedin"><LinkIcon size={16} /> LinkedIn</button>
            <button className="profile-button resume"><FileText size={16} /> Resume</button>
          </div>
        </div>

        {candidate.status === 'scheduled' && candidate.interview && <ScheduledInterviewCard candidate={candidate} />}
        {candidate.notes.length > 0 && <InternalNotes candidate={candidate} />}
        <ActivityHistory candidate={candidate} />
      </section>

      <aside className="candidate-detail-side">
        <QuickActions closeTo={closeTo} role={role} candidate={candidate} source={source} />
      </aside>
    </div>
    {searchParams.get('modal') === 'contact-card' && <ContactCardModal candidate={candidate} closeTo={closeTo} />}
    {searchParams.get('modal') === 'log-contact' && <LogContactAttemptModal candidate={candidate} closeTo={closeTo} />}
    {searchParams.get('modal') === 'rejection-contact' && <LogContactAttemptModal candidate={candidate} closeTo={closeTo} kind="rejection" />}
    </>
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

function InternalNotes({ candidate }: { candidate: Candidate }) {
  return (
    <section className="notes-section">
      <h2><i />Internal Notes</h2>
      <div className="notes-stack">
        {candidate.notes.map((note) => (
          <article className="note-card" key={note.id}>
            <div className="note-card-header">
              <span>{note.author}</span>
              <time>{note.createdAt}</time>
            </div>
            <p>{note.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function QuickActions({ closeTo, role, candidate, source }: { closeTo: string; role: AppOutletContext['role']; candidate: Candidate; source: string | null }) {
  const [processOpen, setProcessOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [offerOpen, setOfferOpen] = useState(false)
  const queryPrefix = closeTo.includes('?') ? '&' : '?'

  if (source !== 'rejection' && (candidate.status === 'rejected' || candidate.status === 'withdrawn')) return null

  return (
    <section className="quick-actions-card">
      <span className="eyebrow">QUICK ACTIONS</span>
      {role === 'hr' && source !== 'rejection' && <Link to={`${closeTo}${queryPrefix}modal=contact-card`}><Phone size={16} /> Contact Info</Link>}
      {role === 'hr' && source !== 'rejection' && candidate.stage !== 'offer_stage' && <Link to={`${closeTo}${queryPrefix}modal=log-contact`}><RotateCcw size={16} /> Log Contact Attempt</Link>}
      {role === 'hr' && source === 'rejection' && <Link to={`${closeTo}${queryPrefix}modal=rejection-contact`}><RotateCcw size={16} /> Rejection Handling</Link>}
      <div className="quick-action-group">
        <button onClick={() => setNoteOpen((open) => !open)}><NotebookPen size={16} /> Add Note <ChevronDown className={`push ${noteOpen ? 'chevron-open' : ''}`} size={16} /></button>
        {noteOpen && <div className="quick-note-box">
          <textarea placeholder="Type your note here..." />
          <div className="quick-note-actions">
            <button className="quick-note-save">Save</button>
            <button className="quick-note-cancel" onClick={() => setNoteOpen(false)}>Cancel</button>
          </div>
        </div>}
      </div>
      {role === 'hm' && candidate.stage === 'manager_review' && (
        <div className="quick-action-group">
          <button onClick={() => setProcessOpen((open) => !open)}><Search size={16} /> Process <ChevronDown className={`push ${processOpen ? 'chevron-open' : ''}`} size={16} /></button>
          {processOpen && <div className="quick-action-menu">
            <button>Approve for Offer</button>
            <button>Waitlist</button>
            <button className="quick-action-danger">Reject</button>
          </div>}
        </div>
      )}
      {role === 'hr' && candidate.stage === 'hr_interview' && candidate.status === 'scheduled' && source !== 'rejection' && (
        <div className="quick-action-group">
          <button onClick={() => setProcessOpen((open) => !open)}><Search size={16} /> Process <ChevronDown className={`push ${processOpen ? 'chevron-open' : ''}`} size={16} /></button>
          {processOpen && <div className="quick-action-menu">
            <button>Move to Manager Review</button>
            <button className="quick-action-danger">Reject</button>
          </div>}
        </div>
      )}
      {role === 'hr' && candidate.stage === 'offer_stage' && source !== 'rejection' && (
        <div className="quick-action-group">
          <button onClick={() => setOfferOpen((open) => !open)}><Search size={16} /> Offer Handling <ChevronDown className={`push ${offerOpen ? 'chevron-open' : ''}`} size={16} /></button>
          {offerOpen && <div className="quick-action-menu">
            {candidate.status === 'approved_for_offer' && <button>Send Offer</button>}
            {candidate.status === 'offer_sent' && <><button className="quick-action-accent">Offer Accepted</button><button className="quick-action-danger">Offer Rejected</button></>}
            {candidate.status === 'offer_rejected' && <button>Offer Rejected</button>}
            {candidate.status === 'offer_accepted' && <button>Offer Accepted</button>}
          </div>}
        </div>
      )}
    </section>
  )
}

function ActivityHistory({ candidate }: { candidate: Candidate }) {
  const visible = [...candidate.activity].reverse()
  return (
    <section className="activity-section">
      <h2><i />Activity History</h2>
      <ol className="figma-activity-list">
        {visible.map((item) => (
          <li key={item.id}>
            <span className="activity-index">{item.index}</span>
            <div><strong className={item.tone ?? ''}>{item.title}</strong>{item.subtitle && <small>{item.subtitle}</small>}</div>
            <time>{item.date ?? item.title}</time>
          </li>
        ))}
      </ol>
    </section>
  )
}
