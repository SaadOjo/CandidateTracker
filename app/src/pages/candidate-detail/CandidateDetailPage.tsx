import {
  CalendarDays,
  ChevronDown,
  Copy,
  FileText,
  Link as LinkIcon,
  LoaderCircle,
  Mail,
  NotebookPen,
  Phone,
  RotateCcw,
  Search,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getCandidate, getProject, listCandidates, transitionCandidate } from '../../data/api'
import { stageLabels, statusLabels } from '../../domain/labels'
import type { AuthSession, Candidate, CandidateNote, CandidateTransitionAction, NoteField, Project } from '../../domain/types'

interface CandidateDetailPageProps {
  session: AuthSession
}

export function CandidateDetailPage({ session }: CandidateDetailPageProps) {
  const { projectId = '', candidateId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [projectCandidates, setProjectCandidates] = useState<Candidate[]>([])
  const [savedNotes, setSavedNotes] = useState<CandidateNote[]>([])
  const [resumeOpen, setResumeOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const role = session.appRole === 'hm' ? 'hm' : 'hr'
  const navigate = useNavigate()

  const loadCandidate = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [candidateItem, projectItem, projectCandidateItems] = await Promise.all([
        getCandidate(candidateId),
        getProject(projectId),
        listCandidates({ projectId }),
      ])
      setCandidate(candidateItem)
      setProject(projectItem)
      setProjectCandidates(projectCandidateItems)
      setSavedNotes(readSavedNotes(candidateId))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load candidate')
    } finally {
      setLoading(false)
    }
  }, [candidateId, projectId])

  useEffect(() => {
    void loadCandidate()
  }, [loadCandidate])

  if (loading) {
    return (
      <section className="surface-panel detail-loading">
        <LoaderCircle className="spin" size={18} />
        Loading
      </section>
    )
  }

  if (error || !candidate) {
    return (
      <section className="surface-panel detail-loading">
        <p className="request-error">{error ?? 'Candidate not found'}</p>
        <Link className="secondary-button" to={`/projects/${projectId}/pipeline/pre_interview`}>Project Pipeline</Link>
      </section>
    )
  }

  const closeTo = `/projects/${projectId}/candidates/${candidate.id}`
  const notes = [...candidate.notes, ...savedNotes]
  const statusLabel = candidate.stage === 'pre_interview' && candidate.status === 'scheduled' ? 'Contact Successful' : statusLabels[candidate.status]

  return (
    <>
      <div className="candidate-detail-screen">
        <section className="candidate-detail-main">
          <div className="detail-title-row">
            <div>
              <h1>{candidate.name}</h1>
              <span className={`status-badge status-badge--${candidate.status}`}>{statusLabel}</span>
            </div>
            <div className="profile-actions">
              {candidate.linkedinProfileUrl ? (
                <a className="profile-button linkedin" href={candidate.linkedinProfileUrl} target="_blank" rel="noreferrer">
                  <LinkIcon size={16} />
                  LinkedIn
                </a>
              ) : (
                <button className="profile-button linkedin" type="button" disabled>
                  <LinkIcon size={16} />
                  LinkedIn
                </button>
              )}
              <button className="profile-button resume" type="button" onClick={() => setResumeOpen((open) => !open)}>
                <FileText size={16} />
                Resume
              </button>
            </div>
          </div>

          {resumeOpen && <InlineResume candidate={candidate} />}
          {candidate.stage === 'pre_interview' && project && <PreInterviewCommentsSection project={project} />}
          {candidate.status === 'scheduled' && candidate.interview && <ScheduledInterviewCard candidate={candidate} />}
          {notes.length > 0 && <InternalNotes notes={notes} role={role} project={project} />}
          <ActivityHistory candidate={candidate} project={project} />
        </section>

        <aside className="candidate-detail-side">
          <QuickActions
            role={role}
            session={session}
            candidate={candidate}
            projectCandidates={projectCandidates}
            onSaveNote={(note) => {
              const next = [...savedNotes, note]
              setSavedNotes(next)
              writeSavedNotes(candidateId, next)
            }}
            onChanged={loadCandidate}
          />
        </aside>
      </div>

      {searchParams.get('modal') === 'contact-card' && <ContactCardModal candidate={candidate} closeTo={closeTo} />}
      {searchParams.get('modal') === 'log-contact' && <LogContactAttemptModal candidate={candidate} closeTo={closeTo} onChanged={loadCandidate} />}
      {searchParams.get('modal') === 'interim-update' && <InterimUpdateModal candidate={candidate} closeTo={closeTo} />}
      {searchParams.get('modal') === 'reject-confirm' && (
        <ConfirmationModal
          title="Are you sure?"
          body={`${candidate.name} will be rejected from ${stageLabels[candidate.stage]}.`}
          closeTo={closeTo}
          onConfirm={async () => {
            await transitionCandidate(candidate.id, 'reject')
            await loadCandidate()
            navigate(closeTo)
          }}
        />
      )}
    </>
  )
}

function PreInterviewCommentsSection({ project }: { project: Project }) {
  const comments = project.stageComments?.filter((comment) => comment.stage === 'pre_interview') ?? []
  const hmComments = comments.filter((comment) => comment.authorRole === 'hiring_manager')
  const hrComments = comments.filter((comment) => comment.authorRole === 'hr')
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

function CommentColumn({ title, items }: { title: string; items: Array<{ id: string; body: string }> }) {
  return (
    <section className="pre-interview-comment-card">
      <h3>{title}</h3>
      {items.length > 0 ? items.map((item) => <p key={item.id}>{item.body}</p>) : <p className="pre-interview-comment-empty">No comments yet.</p>}
    </section>
  )
}

function InlineResume({ candidate }: { candidate: Candidate }) {
  return (
    <section className="inline-resume-card">
      <button className="inline-resume-download" type="button">
        <FileText size={14} />
        Download
      </button>
      <h3>{candidate.name}</h3>
      <small>{formatSource(candidate.source)} Candidate</small>
      <ul>
        <li>Relevant experience and profile details are represented by the linked candidate file.</li>
        <li>Communication, availability, and compensation notes belong in the internal notes section.</li>
        <li>Resume file storage is modeled separately and can be attached when file upload is implemented.</li>
      </ul>
    </section>
  )
}

function ScheduledInterviewCard({ candidate }: { candidate: Candidate }) {
  const interview = candidate.interview
  if (!interview) return null

  return (
    <section className="scheduled-interview-card">
      <div className="scheduled-interview-icon">
        <CalendarDays size={18} />
      </div>
      <div className="scheduled-interview-copy">
        <strong>{interview.title}</strong>
        <p>{formatDateTime(interview.date)}</p>
        <p>{formatTime(interview.date)} · {interview.timezone}</p>
      </div>
      {interview.meetingUrl && (
        <button className="copy-meeting-button" type="button" onClick={() => navigator.clipboard.writeText(interview.meetingUrl ?? '')}>
          <Copy size={14} />
          Copy Meeting URL
        </button>
      )}
    </section>
  )
}

function InternalNotes({ notes, role, project }: { notes: CandidateNote[]; role: 'hr' | 'hm'; project: Project | null }) {
  const visibleNotes = useMemo(
    () => notes.filter((note) => role === 'hr' || note.visibility !== 'hr_only'),
    [notes, role],
  )
  const [collapsedNotes, setCollapsedNotes] = useState<Record<string, boolean>>({})

  if (visibleNotes.length === 0) return null

  return (
    <section className="notes-section">
      <h2><i />Internal Notes</h2>
      <div className="notes-stack">
        {visibleNotes.map((note) => {
          const visibleFields = (note.fields ?? []).filter((field) => role === 'hr' || field.visibility !== 'hr_only')
          const collapsed = collapsedNotes[note.id] ?? true
          return (
            <article className={`note-card ${collapsed ? 'note-card--collapsed' : ''}`} key={note.id}>
              <div className={`note-card-header ${collapsed ? 'note-card-header--collapsed' : ''}`}>
                <span>{formatNoteAuthor(note, project)}</span>
                <div className="note-card-meta">
                  <time>{formatDateTime(note.createdAt)}</time>
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
              {!collapsed && (
                visibleFields.length > 0 ? (
                  <div className="note-form-view">
                    {visibleFields.map((field) => (
                      <div className="note-form-row" key={`${note.id}-${field.question}`}>
                        <strong>{field.question}</strong>
                        <p>{field.answer}</p>
                      </div>
                    ))}
                  </div>
                ) : note.body ? (
                  <p>{note.body}</p>
                ) : null
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function QuickActions({
  role,
  session,
  candidate,
  projectCandidates,
  onSaveNote,
  onChanged,
}: {
  role: 'hr' | 'hm'
  session: AuthSession
  candidate: Candidate
  projectCandidates: Candidate[]
  onSaveNote: (note: CandidateNote) => void
  onChanged: () => Promise<void>
}) {
  const [processOpen, setProcessOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [offerOpen, setOfferOpen] = useState(false)
  const [busyAction, setBusyAction] = useState<CandidateTransitionAction | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [textNote, setTextNote] = useState('')
  const [formNote, setFormNote] = useState<Record<string, string>>({})
  const offerStageCandidates = projectCandidates.filter((item) => item.stage === 'offer_stage')
  const hasAcceptedOfferCandidate = offerStageCandidates.some((item) => item.status === 'offer_accepted')
  const hasOfferSentCandidate = offerStageCandidates.some((item) => item.status === 'offer_sent')
  const firstOfferActionCandidate = offerStageCandidates.find((item) => item.status === 'approved_for_offer' || item.status === 'final_check_sent')
  const canManageOfferFlow = candidate.status === 'offer_sent' || (!hasOfferSentCandidate && firstOfferActionCandidate?.id === candidate.id)
  const showProcess = shouldShowProcess(candidate, role)
  const closeTo = `/projects/${candidate.projectId}/candidates/${candidate.id}`

  if (candidate.status === 'rejected' || candidate.status === 'withdrawn' || candidate.status === 'offer_rejected') return null

  async function runTransition(action: CandidateTransitionAction) {
    setActionError(null)
    setBusyAction(action)
    try {
      await transitionCandidate(candidate.id, action)
      setProcessOpen(false)
      setOfferOpen(false)
      await onChanged()
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : 'Could not update candidate')
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <section className="quick-actions-card">
      <span className="eyebrow">Quick Actions</span>
      {actionError && <p className="request-error">{actionError}</p>}

      <div className="quick-action-group">
        <button type="button" onClick={() => setNoteOpen((open) => !open)}>
          <NotebookPen size={16} />
          Add Note
          <ChevronDown className={`push ${noteOpen ? 'chevron-open' : ''}`} size={16} />
        </button>
        {noteOpen && (
          <div className="quick-note-box">
            {role === 'hr' && (candidate.stage === 'hr_interview' || candidate.stage === 'pre_interview') ? (
              <HrInterviewNoteForm stage={candidate.stage} values={formNote} onChange={setFormNote} />
            ) : (
              <textarea value={textNote} onChange={(event) => setTextNote(event.target.value)} placeholder="Type your note here..." />
            )}
            <div className="quick-note-actions">
              <button
                className="quick-note-save"
                type="button"
                onClick={() => {
                  const note = buildNote(role, session, candidate, textNote, formNote)
                  if (!note) return
                  onSaveNote(note)
                  setTextNote('')
                  setFormNote({})
                  setNoteOpen(false)
                }}
              >
                Save
              </button>
              <button className="quick-note-cancel" type="button" onClick={() => { setNoteOpen(false); setTextNote(''); setFormNote({}) }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {role === 'hr' && candidate.stage !== 'pre_interview' && candidate.stage !== 'manager_review' && (
        <Link to={`${closeTo}?modal=contact-card`}>
          <Phone size={16} />
          Contact Info
        </Link>
      )}

      {role === 'hr' && candidate.stage !== 'manager_review' && candidate.stage !== 'offer_stage' && (
        <Link to={`${closeTo}?modal=log-contact`}>
          <RotateCcw size={16} />
          {candidate.stage === 'pre_interview' ? 'Add Log' : 'Log Contact Attempt'}
        </Link>
      )}

      {showProcess && (
        <div className="quick-action-group">
          <button type="button" onClick={() => setProcessOpen((open) => !open)}>
            <Search size={16} />
            Process
            <ChevronDown className={`push ${processOpen ? 'chevron-open' : ''}`} size={16} />
          </button>
          {processOpen && (
            <div className="quick-action-menu">
              {getProcessActions(candidate, role).map((item) => (
                <button
                  disabled={Boolean(busyAction)}
                  key={item.action}
                  type="button"
                  onClick={() => void runTransition(item.action)}
                >
                  {busyAction === item.action ? 'Saving...' : item.label}
                </button>
              ))}
              <button
                className="quick-action-danger"
                disabled={Boolean(busyAction)}
                type="button"
                onClick={() => void runTransition('reject')}
              >
                {busyAction === 'reject' ? 'Saving...' : 'Reject'}
              </button>
            </div>
          )}
        </div>
      )}

      {role === 'hr' && candidate.stage === 'manager_review' && candidate.status === 'waitlisted' && (
        <Link to={`${closeTo}?modal=interim-update`}>
          <RotateCcw size={16} />
          Interim Update
        </Link>
      )}

      {role === 'hr' && candidate.stage === 'offer_stage' && !hasAcceptedOfferCandidate && canManageOfferFlow && (
        <div className="quick-action-group">
          <button type="button" onClick={() => setOfferOpen((open) => !open)}>
            <Search size={16} />
            Offer Handling
            <ChevronDown className={`push ${offerOpen ? 'chevron-open' : ''}`} size={16} />
          </button>
          {offerOpen && (
            <div className="quick-action-menu">
              {candidate.status === 'approved_for_offer' && (
                <button disabled={Boolean(busyAction)} type="button" onClick={() => void runTransition('send_final_check')}>
                  {busyAction === 'send_final_check' ? 'Saving...' : 'Send Final Check'}
                </button>
              )}
              {candidate.status === 'final_check_sent' && (
                <button className="quick-action-accent" disabled={Boolean(busyAction)} type="button" onClick={() => void runTransition('send_offer')}>
                  {busyAction === 'send_offer' ? 'Saving...' : 'Send Offer'}
                </button>
              )}
              {candidate.status === 'offer_sent' && (
                <button className="quick-action-accent" disabled={Boolean(busyAction)} type="button" onClick={() => void runTransition('offer_accepted')}>
                  {busyAction === 'offer_accepted' ? 'Saving...' : 'Offer Accepted'}
                </button>
              )}
              <button
                className="quick-action-danger"
                disabled={Boolean(busyAction)}
                type="button"
                onClick={() => void runTransition('reject')}
              >
                {busyAction === 'reject' ? 'Saving...' : 'Reject'}
              </button>
            </div>
          )}
        </div>
      )}
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

function ActivityHistory({ candidate, project }: { candidate: Candidate; project: Project | null }) {
  const visible = [...candidate.activity].reverse()

  return (
    <section className="activity-section">
      <h2><i />Activity History</h2>
      {visible.length > 0 ? (
        <ol className="figma-activity-list">
          {visible.map((item, index) => (
            <li key={item.id}>
              <span className="activity-index">{visible.length - index}</span>
              <div>
                <strong>{item.title}</strong>
                <small>{item.subtitle ?? getActivityExplanation(item.title, candidate, project)}</small>
              </div>
              <time>{formatDateTime(item.occurredAt ?? item.createdAt ?? '')}</time>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-row">No activity yet.</p>
      )}
    </section>
  )
}

function ContactCardModal({ candidate, closeTo }: { candidate: Candidate; closeTo: string }) {
  return (
    <ModalFrame closeTo={closeTo} className="contact-card-surface">
      <section className="contact-card-modal">
        <h1>{candidate.name}</h1>
        <p>{formatSource(candidate.source)} Candidate</p>
        <div className="contact-info-list">
          <ContactInfoRow icon={<Mail size={18} />} label="Email" value={candidate.email ?? '—'} />
          <ContactInfoRow icon={<Phone size={18} />} label="Phone" value={candidate.phone ?? '—'} />
        </div>
        <div className="contact-card-actions">
          <button className="copy-info-button" type="button" onClick={() => navigator.clipboard.writeText(candidate.email ?? '')}>Copy Email</button>
          <button className="copy-info-button copy-info-button--secondary" type="button" onClick={() => navigator.clipboard.writeText(candidate.phone ?? '')}>Copy Phone</button>
        </div>
      </section>
    </ModalFrame>
  )
}

function ContactInfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="contact-info-row">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  )
}

function LogContactAttemptModal({
  candidate,
  closeTo,
  onChanged,
}: {
  candidate: Candidate
  closeTo: string
  onChanged: () => Promise<void>
}) {
  const navigate = useNavigate()
  const options = getContactResultOptions(candidate)
  const [result, setResult] = useState<ContactLogResult>(options[0])
  const [attemptedAt, setAttemptedAt] = useState(() => toDateTimeLocalValue(new Date()))
  const [interviewStartAt, setInterviewStartAt] = useState(() => toDateTimeLocalValue(defaultInterviewDate()))
  const [meetingUrl, setMeetingUrl] = useState(() => `https://meet.example.com/${candidate.id}`)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showInterviewFields = result === 'scheduled'

  async function saveLog() {
    setSaving(true)
    setError(null)
    try {
      await transitionCandidate(candidate.id, {
        action: getContactTransitionAction(candidate, result),
        notes: notes.trim() || undefined,
        occurredAt: new Date(attemptedAt).toISOString(),
        interviewStartAt: showInterviewFields ? new Date(interviewStartAt).toISOString() : undefined,
        meetingUrl: showInterviewFields ? meetingUrl.trim() || undefined : undefined,
      })
      await onChanged()
      navigate(closeTo)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save contact log')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalFrame closeTo={closeTo} className="log-contact-surface">
      <section className="log-contact-modal">
        <h1>Log Contact Attempt</h1>
        <p className="modal-subtitle">{candidate.name} · {stageLabels[candidate.stage]}</p>
        {error && <p className="request-error">{error}</p>}
        <div className="figma-log-section">
          <h2>Attempt Result</h2>
          <div className="radio-stack">
            {options.map((option) => (
              <label className="radio-option" key={option}>
                <input checked={result === option} name="result" type="radio" onChange={() => setResult(option)} />
                {getContactResultLabel(option)}
              </label>
            ))}
          </div>
        </div>
        <div className="figma-log-section">
          <h2>Attempt Date &amp; Time*</h2>
          <input className="combined-date-field combined-date-input" type="datetime-local" value={attemptedAt} onChange={(event) => setAttemptedAt(event.target.value)} />
        </div>
        {showInterviewFields && (
          <>
            <div className="figma-log-section">
              <h2>Interview Date &amp; Time*</h2>
              <input className="combined-date-field combined-date-input" type="datetime-local" value={interviewStartAt} onChange={(event) => setInterviewStartAt(event.target.value)} />
            </div>
            <div className="figma-log-section">
              <h2>Meeting URL*</h2>
              <input className="combined-date-field combined-date-input" value={meetingUrl} onChange={(event) => setMeetingUrl(event.target.value)} />
            </div>
          </>
        )}
        <div className="figma-log-section">
          <h2 className="optional-heading"><span>Notes</span><em>Optional</em></h2>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Briefly describe the outcome of the call..." />
        </div>
        <footer className="figma-log-footer">
          <Link to={closeTo}>Cancel</Link>
          <button className="save-log-button" disabled={saving} type="button" onClick={() => void saveLog()}>
            {saving ? 'Saving...' : 'Save Log'}
          </button>
        </footer>
      </section>
    </ModalFrame>
  )
}

function InterimUpdateModal({ candidate, closeTo }: { candidate: Candidate; closeTo: string }) {
  const navigate = useNavigate()

  return (
    <ModalFrame closeTo={closeTo} className="log-contact-surface">
      <section className="log-contact-modal">
        <h1>Interim Update</h1>
        <p className="modal-subtitle">{candidate.name} · {stageLabels[candidate.stage]}</p>
        <div className="figma-log-section">
          <h2>Message</h2>
          <textarea placeholder="Add update sent to candidate..." />
        </div>
        <footer className="figma-log-footer">
          <Link to={closeTo}>Cancel</Link>
          <button className="save-log-button" type="button" onClick={() => navigate(closeTo)}>Save Update</button>
        </footer>
      </section>
    </ModalFrame>
  )
}

function ConfirmationModal({ title, body, closeTo, onConfirm }: { title: string; body: string; closeTo: string; onConfirm: () => void | Promise<void> }) {
  return (
    <ModalFrame closeTo={closeTo}>
      <section className="confirmation-popover confirmation-popover--modal">
        <h3>{title}</h3>
        <p>{body}</p>
        <div className="confirmation-popover-actions">
          <Link to={closeTo}>Cancel</Link>
          <button className="confirmation-approve" type="button" onClick={() => void onConfirm()}>Confirm</button>
        </div>
      </section>
    </ModalFrame>
  )
}

function ModalFrame({ closeTo, className = '', children }: { closeTo: string; className?: string; children: ReactNode }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <Link className="modal-scrim-link" to={closeTo} aria-label="Close modal" />
      <div className={`modal-surface ${className}`}>
        <Link className="modal-close" to={closeTo} aria-label="Close modal">
          <X size={18} />
        </Link>
        {children}
      </div>
    </div>
  )
}

function buildNote(role: 'hr' | 'hm', session: AuthSession, candidate: Candidate, textNote: string, formNote: Record<string, string>): CandidateNote | null {
  const createdAt = new Date().toISOString()
  if (role === 'hr' && (candidate.stage === 'hr_interview' || candidate.stage === 'pre_interview')) {
    const fields: NoteField[] = Object.entries(formNote)
      .filter(([, answer]) => answer.trim())
      .map(([question, answer]) => ({
        question,
        answer: answer.trim(),
        visibility: question === 'What is the expected wage?' ? 'hr_only' : 'all',
      }))
    if (fields.length === 0) return null
    return {
      id: `saved-${candidate.id}-${Date.now()}`,
      authorRole: 'hr',
      author: { id: session.userId, name: session.name, role: session.role },
      fields,
      visibility: 'all',
      createdAt,
    }
  }

  if (!textNote.trim()) return null
  return {
    id: `saved-${candidate.id}-${Date.now()}`,
    authorRole: role === 'hr' ? 'hr' : 'hiring_manager',
    author: { id: session.userId, name: session.name, role: session.role },
    body: textNote.trim(),
    visibility: 'all',
    createdAt,
  }
}

function getProcessActions(candidate: Candidate, role: 'hr' | 'hm'): Array<{ label: string; action: CandidateTransitionAction }> {
  if (candidate.stage === 'pre_interview') return [{ label: 'Move to Department Interview Stage', action: 'move_to_department_interview' }]
  if (candidate.stage === 'department_interview' && role === 'hm') return [{ label: 'Move to HR Stage', action: 'move_to_hr_interview' }]
  if (candidate.stage === 'hr_interview') {
    return candidate.status === 'assessment_sent'
      ? [{ label: 'Move to Candidate Review', action: 'move_to_candidate_review' }]
      : [{ label: 'Send Assessment', action: 'send_assessment' }]
  }
  if (candidate.stage === 'manager_review') {
    return [
      { label: 'Approve for Offer', action: 'approve_for_offer' },
      { label: 'Waitlist', action: 'waitlist' },
    ]
  }
  return []
}

type ContactLogResult = 'contact_successful' | 'scheduled' | 'not_reached' | 'withdrawn'

function getContactResultOptions(candidate: Candidate): ContactLogResult[] {
  if (candidate.stage === 'pre_interview') return ['contact_successful', 'not_reached', 'withdrawn']
  return ['scheduled', 'not_reached', 'withdrawn']
}

function getContactResultLabel(result: ContactLogResult) {
  if (result === 'contact_successful') return 'Contact Successful'
  if (result === 'scheduled') return 'Scheduled'
  if (result === 'not_reached') return 'Not Reached'
  return 'Withdrawn'
}

function getContactTransitionAction(candidate: Candidate, result: ContactLogResult): CandidateTransitionAction {
  if (result === 'scheduled') {
    return candidate.stage === 'hr_interview' ? 'schedule_hr_interview' : 'schedule_department_interview'
  }
  if (result === 'not_reached') return 'mark_not_reached'
  if (result === 'withdrawn') return 'withdraw'
  return 'mark_contact_successful'
}

function shouldShowProcess(candidate: Candidate, role: 'hr' | 'hm') {
  if (candidate.stage === 'pre_interview') return candidate.status === 'scheduled'
  if (candidate.stage === 'department_interview') return role === 'hm' && candidate.status === 'scheduled'
  if (candidate.stage === 'hr_interview') return role === 'hr' && candidate.status !== 'rejected' && candidate.status !== 'withdrawn'
  if (candidate.stage === 'manager_review') return role === 'hr' || role === 'hm'
  return false
}

function formatNoteAuthor(note: CandidateNote, project: Project | null) {
  if (note.author?.name) return `${formatAuthorRole(note.authorRole)} · ${note.author.name}`
  if (note.authorRole === 'hiring_manager') return `Hiring Manager · ${project?.hiringManager ?? '—'}`
  if (note.authorRole === 'hr') return `HR Manager · ${project?.assignedHr?.[0] ?? '—'}`
  return 'Internal Note'
}

function formatAuthorRole(role: CandidateNote['authorRole']) {
  if (role === 'hiring_manager') return 'Hiring Manager'
  if (role === 'hr') return 'HR Manager'
  return 'User'
}

function getActivityExplanation(title: string, candidate: Candidate, project: Project | null) {
  const hiringManager = project?.hiringManager ?? '—'
  const hrManager = project?.assignedHr?.[0] ?? '—'

  if (title === 'Moved to Department Interview Stage') return `Moved by HR Manager - ${hrManager}`
  if (title === 'Department Interview Scheduled') return `Scheduled by HR Manager - ${hrManager}`
  if (title === 'Moved to HR Interview Stage') return `Moved by Hiring Manager - ${hiringManager}`
  if (title === 'HR Interview Scheduled') return `Scheduled by HR Manager - ${hrManager}`
  if (title.includes('Contact') || title.includes('Pre-Interview') || title.includes('Withdrawn')) return `Contact at ${stageLabels[candidate.stage]} · HR Manager - ${hrManager}`
  if (title.includes('Department Interview')) return `Hiring Manager - ${hiringManager}`
  if (title.includes('HR Interview')) return `HR Manager - ${hrManager}`
  if (title.includes('Offer') || candidate.stage === 'offer_stage') return `HR Manager - ${hrManager}`
  if (title.includes('Hiring Manager') || candidate.stage === 'manager_review') return `Hiring Manager - ${hiringManager}`
  return `Activity at ${stageLabels[candidate.stage]}`
}

function readSavedNotes(candidateId: string) {
  const raw = window.localStorage.getItem(`candidate-notes:${candidateId}`)
  return raw ? JSON.parse(raw) as CandidateNote[] : []
}

function writeSavedNotes(candidateId: string, notes: CandidateNote[]) {
  window.localStorage.setItem(`candidate-notes:${candidateId}`, JSON.stringify(notes))
}

function formatSource(source: string) {
  if (source === 'linkedin') return 'LinkedIn'
  return source.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date)
}

function defaultInterviewDate() {
  const date = new Date()
  date.setDate(date.getDate() + 2)
  date.setHours(10, 0, 0, 0)
  return date
}

function toDateTimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}
