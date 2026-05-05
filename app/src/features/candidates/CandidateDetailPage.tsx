import { CalendarCheck, ChevronDown, Clock3, FileText, Link as LinkIcon, NotebookPen, Phone, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { candidateTrackerRepository } from '../../data/repository'
import type { Candidate } from '../../domain/types'
import { ContactCardModal } from './ContactCardModal'
import { LogContactAttemptModal } from './LogContactAttemptModal'

export function CandidateDetailPage() {
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

        <InterviewPanel candidate={candidate} />
        <ActivityHistory candidate={candidate} />
      </section>

      <aside className="candidate-detail-side">
        <QuickActions closeTo={closeTo} />
      </aside>
    </div>
    {searchParams.get('modal') === 'contact-card' && <ContactCardModal candidate={candidate} closeTo={closeTo} />}
    {searchParams.get('modal') === 'log-contact' && <LogContactAttemptModal candidate={candidate} closeTo={closeTo} />}
    {searchParams.get('modal') === 'rejection-contact' && <LogContactAttemptModal candidate={candidate} closeTo={closeTo} kind="rejection" />}
    </>
  )
}

function InterviewPanel({ candidate }: { candidate: Candidate }) {
  if (candidate.interview) {
    return (
      <section className="interview-detail-card">
        <CalendarCheck className="watermark" size={58} />
        <span className="eyebrow icon-label"><CalendarCheck size={13} /> {candidate.interview.title}</span>
        <h2>{candidate.interview.date}</h2>
        <p>{candidate.interview.time} ({candidate.interview.timezone})</p>
        <button className="dark-button copy-button">Copy Meeting URL</button>
      </section>
    )
  }

  if (candidate.status === 'not_reached') {
    return <section className="interview-detail-card"><span className="eyebrow icon-label"><Clock3 size={13} /> Contact follow-up required</span><h2>Candidate not reached</h2><p>Log the next attempt or schedule an interview when contact is made.</p><button className="dark-button copy-button">Log Contact Attempt</button></section>
  }

  if (candidate.status === 'rejected') {
    return <section className="interview-detail-card rejected-panel"><span className="eyebrow icon-label"><FileText size={13} /> REJECTION FOLLOW-UP</span><h2>Rejected</h2><p>Process candidate communication and rejection tracking.</p><Link className="dark-button copy-button" to={`?modal=rejection-contact`}>Process</Link></section>
  }

  return <section className="interview-detail-card"><span className="eyebrow icon-label"><Clock3 size={13} /> Waiting for Contact</span><h2>No interview scheduled</h2><p>Use quick actions to contact the candidate or move them forward.</p></section>
}

function QuickActions({ closeTo }: { closeTo: string }) {
  return (
    <section className="quick-actions-card">
      <span className="eyebrow">Quick Actions</span>
      <Link to={`${closeTo}?modal=contact-card`}><Phone size={16} /> Contact Info</Link>
      <Link to={`${closeTo}?modal=log-contact`}><RotateCcw size={16} /> Log Contact Attempt</Link>
      <button><NotebookPen size={16} /> Add Note <ChevronDown className="push" size={16} /></button>
    </section>
  )
}

function ActivityHistory({ candidate }: { candidate: Candidate }) {
  const visible = candidate.activity.slice(-3).reverse()
  return (
    <section className="activity-section">
      <h2><i />Activity History</h2>
      <ol className="figma-activity-list">
        {visible.map((item) => (
          <li key={item.id}>
            <span className="activity-index">{item.index}</span>
            <div><strong className={item.tone ?? ''}>{item.title}</strong><small>{item.subtitle}</small></div>
            <time>{item.date ?? item.title}</time>
          </li>
        ))}
      </ol>
    </section>
  )
}
