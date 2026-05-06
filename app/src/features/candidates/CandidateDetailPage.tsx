import { ChevronDown, FileText, Link as LinkIcon, NotebookPen, Phone, RotateCcw, Search } from 'lucide-react'
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

  const closeTo = `/projects/${projectId}/candidates/${candidate.id}`

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

        {candidate.notes.length > 0 && <InternalNotes candidate={candidate} />}
        <ActivityHistory candidate={candidate} />
      </section>

      <aside className="candidate-detail-side">
        <QuickActions closeTo={closeTo} role={role} stage={candidate.stage} />
      </aside>
    </div>
    {searchParams.get('modal') === 'contact-card' && <ContactCardModal candidate={candidate} closeTo={closeTo} />}
    {searchParams.get('modal') === 'log-contact' && <LogContactAttemptModal candidate={candidate} closeTo={closeTo} />}
    {searchParams.get('modal') === 'rejection-contact' && <LogContactAttemptModal candidate={candidate} closeTo={closeTo} kind="rejection" />}
    </>
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

function QuickActions({ closeTo, role, stage }: { closeTo: string; role: AppOutletContext['role']; stage: Candidate['stage'] }) {
  const [processOpen, setProcessOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)

  return (
    <section className="quick-actions-card">
      <span className="eyebrow">QUICK ACTIONS</span>
      {role === 'hr' && <Link to={`${closeTo}?modal=contact-card`}><Phone size={16} /> Contact Info</Link>}
      {role === 'hr' && <Link to={`${closeTo}?modal=log-contact`}><RotateCcw size={16} /> Log Contact Attempt</Link>}
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
      {role === 'hm' && stage === 'manager_review' && (
        <div className="quick-action-group">
          <button onClick={() => setProcessOpen((open) => !open)}><Search size={16} /> Process <ChevronDown className={`push ${processOpen ? 'chevron-open' : ''}`} size={16} /></button>
          {processOpen && <div className="quick-action-menu">
            <button>Approve for Offer</button>
            <button>Waitlist</button>
            <button>Reject</button>
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
