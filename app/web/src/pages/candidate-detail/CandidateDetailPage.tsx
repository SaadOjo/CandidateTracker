import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { candidateQueryKey, useCandidate } from '../../app/queries/useCandidate'
import { useCandidates } from '../../app/queries/useCandidates'
import { useProject } from '../../app/queries/useProject'
import { ErrorMessage } from '../../components/feedback/ErrorMessage'
import { LoadingState } from '../../components/feedback/LoadingState'
import { ConfirmationModal } from '../../components/ui/ConfirmationModal'
import { transitionCandidate, upsertCandidateNote } from '../../data/api'
import { stageLabels, statusLabels } from '../../domain/labels'
import { requireCandidateWorkflowRole } from '../../domain/roles'
import type { AuthSession } from '../../domain/types'
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
const candidateModalNames = new Set([
  'contact-card',
  'log-contact',
  'rejection-contact',
  'interim-update',
  'reject-confirm',
])

export function CandidateDetailPage({ session }: CandidateDetailPageProps) {
  const { projectId = '', candidateId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const candidateQuery = useCandidate(session.userId, candidateId)
  const projectQuery = useProject(session.userId, projectId)
  const projectCandidatesQuery = useCandidates(session.userId, { projectId }, Boolean(projectId))
  const candidate = candidateQuery.data ?? null
  const project = projectQuery.data ?? null
  const projectCandidates = projectCandidatesQuery.data ?? []
  const [resumeOpen, setResumeOpen] = useState(false)
  const loading = candidateQuery.isPending || projectQuery.isPending || projectCandidatesQuery.isPending
  const error = candidateQuery.isError
    ? candidateQuery.error.message
    : projectQuery.isError
      ? projectQuery.error.message
      : projectCandidatesQuery.isError ? projectCandidatesQuery.error.message : null
  const role = requireCandidateWorkflowRole(session.appRole)
  const navigate = useNavigate()

  async function loadCandidate() {
    await Promise.all([
      candidateQuery.refetch(),
      projectQuery.refetch(),
      projectCandidatesQuery.refetch(),
    ])
  }

  if (loading) {
    return (
      <section className={loadingPanelClasses}>
        <LoadingState />
      </section>
    )
  }

  if (error) {
    return (
      <section className={loadingPanelClasses}>
        <ErrorMessage message={error} />
        <Link className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-md border border-border-strong bg-white px-[13px] font-extrabold text-ink no-underline" to={`/projects/${projectId}/pipeline/pre_interview`}>Project Pipeline</Link>
      </section>
    )
  }

  if (!candidate) throw new Error('Candidate query completed without candidate data')
  if (!project) throw new Error('Project query completed without project data')

  const source = searchParams.get('source')
  if (source !== null && source !== 'rejection') throw new Error(`Unsupported candidate source route: ${source}`)
  const modal = searchParams.get('modal')
  if (modal !== null && !candidateModalNames.has(modal)) throw new Error(`Unsupported candidate modal: ${modal}`)

  const isRejectionFollowUp = source === 'rejection'
  if (isRejectionFollowUp && !candidate.rejectionFollowUp) {
    throw new Error(`Candidate ${candidate.id} has no rejection follow-up for the rejection source route`)
  }
  const closeTo = `/projects/${projectId}/candidates/${candidate.id}${isRejectionFollowUp ? '?source=rejection' : ''}`
  const statusLabel = candidate.stage === 'pre_interview' && candidate.status === 'scheduled' ? 'Contact Successful' : statusLabels[candidate.status]

  return (
    <>
      <div className="relative grid grid-cols-[minmax(0,777px)_327px] gap-x-[43px] px-8 pt-10 pb-16 max-[1100px]:grid-cols-1 max-[760px]:px-3">
        <section className="min-w-0">
          <CandidateHeader candidate={candidate} statusLabel={statusLabel} onToggleResume={() => setResumeOpen((open) => !open)} />
          {resumeOpen && <InlineResume candidate={candidate} />}
          {candidate.stage === 'pre_interview' && <PreInterviewCommentsSection project={project} />}
          {candidate.status === 'scheduled' && candidate.interview && <ScheduledInterviewCard candidate={candidate} />}
          {candidate.notes.length > 0 && <InternalNotes notes={candidate.notes} role={role} />}
          <ActivityHistory candidate={candidate} />
        </section>

        <aside className="pt-[120px] max-[1100px]:pt-6">
          <QuickActions
            role={role}
            session={session}
            candidate={candidate}
            projectCandidates={projectCandidates}
            isRejectionFollowUp={isRejectionFollowUp}
            onSaveNote={async (input) => {
              const updatedCandidate = await upsertCandidateNote(candidate.id, input)
              queryClient.setQueryData(candidateQueryKey(session.userId, candidate.id), updatedCandidate)
              notifyCandidateChanged()
            }}
            onChanged={loadCandidate}
          />
        </aside>
      </div>

      {modal === 'contact-card' && <ContactCardModal candidate={candidate} closeTo={closeTo} />}
      {modal === 'log-contact' && <LogContactAttemptModal candidate={candidate} closeTo={closeTo} onChanged={loadCandidate} />}
      {modal === 'rejection-contact' && <RejectionContactModal candidate={candidate} closeTo={closeTo} onChanged={loadCandidate} />}
      {modal === 'interim-update' && <InterimUpdateModal candidate={candidate} closeTo={closeTo} />}
      {modal === 'reject-confirm' && (
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
