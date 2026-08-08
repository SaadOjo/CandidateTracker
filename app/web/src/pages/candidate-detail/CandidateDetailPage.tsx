import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ErrorMessage } from '../../components/feedback/ErrorMessage'
import { LoadingState } from '../../components/feedback/LoadingState'
import { ConfirmationModal } from '../../components/ui/ConfirmationModal'
import { getCandidate, getProject, listCandidates, transitionCandidate, upsertCandidateNote } from '../../data/api'
import { stageLabels, statusLabels } from '../../domain/labels'
import type { AuthSession, Candidate, Project } from '../../domain/types'
import { notifyCandidateChanged } from './candidateDetailHelpers'
import { ActivityHistory } from './components/ActivityHistory'
import { CandidateHeader } from './components/CandidateHeader'
import { InlineResume } from './components/InlineResume'
import { InternalNotes } from './components/InternalNotes'
import { PreInterviewCommentsSection } from './components/PreInterviewCommentsSection'
import { QuickActions } from './components/QuickActions'
import { ScheduledInterviewCard } from './components/ScheduledInterviewCard'
import { ContactCardModal } from './modals/ContactCardModal'
import { InterimUpdateModal } from './modals/InterimUpdateModal'
import { LogContactAttemptModal } from './modals/LogContactAttemptModal'
import { RejectionContactModal } from './modals/RejectionContactModal'

interface CandidateDetailPageProps {
  session: AuthSession
}

const loadingPanelClasses = 'm-10 flex items-center gap-3 rounded-lg border border-border bg-white p-[26px]'

export function CandidateDetailPage({ session }: CandidateDetailPageProps) {
  const { projectId = '', candidateId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [projectCandidates, setProjectCandidates] = useState<Candidate[]>([])
  const [resumeOpen, setResumeOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const role = session.appRole === 'hiring_manager' ? 'hiring_manager' : 'human_resource'
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
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load candidate')
    } finally {
      setLoading(false)
    }
  }, [candidateId, projectId])

  useEffect(() => {
    // Route changes intentionally start a fresh request and reset the loading state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCandidate()
  }, [loadCandidate])

  if (loading) {
    return (
      <section className={loadingPanelClasses}>
        <LoadingState />
      </section>
    )
  }

  if (error || !candidate) {
    return (
      <section className={loadingPanelClasses}>
        <ErrorMessage message={error ?? 'Candidate not found'} />
        <Link className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-md border border-border-strong bg-white px-[13px] font-extrabold text-ink no-underline" to={`/projects/${projectId}/pipeline/pre_interview`}>Project Pipeline</Link>
      </section>
    )
  }

  const source = searchParams.get('source')
  const isRejectionFollowUp = source === 'rejection'
  const closeTo = `/projects/${projectId}/candidates/${candidate.id}${isRejectionFollowUp ? '?source=rejection' : ''}`
  const statusLabel = candidate.stage === 'pre_interview' && candidate.status === 'scheduled' ? 'Contact Successful' : statusLabels[candidate.status]

  return (
    <>
      <div className="relative grid grid-cols-[minmax(0,777px)_327px] gap-x-[43px] px-8 pt-10 pb-16 max-[1100px]:grid-cols-1 max-[760px]:px-3">
        <section className="min-w-0">
          <CandidateHeader candidate={candidate} statusLabel={statusLabel} onToggleResume={() => setResumeOpen((open) => !open)} />
          {resumeOpen && <InlineResume candidate={candidate} />}
          {candidate.stage === 'pre_interview' && project && <PreInterviewCommentsSection project={project} />}
          {candidate.status === 'scheduled' && candidate.interview && <ScheduledInterviewCard candidate={candidate} />}
          {candidate.notes.length > 0 && <InternalNotes notes={candidate.notes} role={role} project={project} />}
          <ActivityHistory candidate={candidate} project={project} />
        </section>

        <aside className="pt-[120px] max-[1100px]:pt-6">
          <QuickActions
            role={role}
            session={session}
            candidate={candidate}
            projectCandidates={projectCandidates}
            isRejectionFollowUp={isRejectionFollowUp}
            onSaveNote={async (input) => {
              setCandidate(await upsertCandidateNote(candidate.id, input))
              notifyCandidateChanged()
            }}
            onChanged={loadCandidate}
          />
        </aside>
      </div>

      {searchParams.get('modal') === 'contact-card' && <ContactCardModal candidate={candidate} closeTo={closeTo} />}
      {searchParams.get('modal') === 'log-contact' && <LogContactAttemptModal candidate={candidate} closeTo={closeTo} onChanged={loadCandidate} />}
      {searchParams.get('modal') === 'rejection-contact' && <RejectionContactModal candidate={candidate} closeTo={closeTo} onChanged={loadCandidate} />}
      {searchParams.get('modal') === 'interim-update' && <InterimUpdateModal candidate={candidate} closeTo={closeTo} />}
      {searchParams.get('modal') === 'reject-confirm' && (
        <ConfirmationModal
          title="Are you sure?"
          body={`${candidate.name} will be rejected from ${stageLabels[candidate.stage]}.`}
          closeTo={closeTo}
          onConfirm={async () => {
            await transitionCandidate(candidate.id, 'reject')
            await loadCandidate()
            notifyCandidateChanged()
            navigate(closeTo)
          }}
        />
      )}
    </>
  )
}
