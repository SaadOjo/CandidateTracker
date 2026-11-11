import { useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { candidateQueryKey, useCandidate } from '../../app/queries/useCandidate'
import { invalidateWorkflow } from '../../app/queries/invalidateWorkflow'
import { useCandidates } from '../../app/queries/useCandidates'
import { useProject } from '../../app/queries/useProject'
import type { AuthSession } from '../../auth/auth'
import { ErrorMessage } from '../../components/feedback/ErrorMessage'
import { LoadingState } from '../../components/feedback/LoadingState'
import { ConfirmationModal } from '../../components/ui/ConfirmationModal'
import { transitionCandidate, upsertCandidateNote } from '../../data/api'
import { stageLabels, stageOrder, statusLabels } from '../../domain/labels'
import type { CandidateNoteInput } from '../../domain/types'
import { requireCandidateWorkflowRole } from '../../domain/roles'
import { ActivityHistory } from './components/ActivityHistory'
import { CandidateHeader } from './components/CandidateHeader'
import { CandidateNoteEditor } from './components/candidate-notes/CandidateNoteEditor'
import { InternalNotes } from './components/InternalNotes'
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
  const location = useLocation()
  const queryClient = useQueryClient()
  const candidateQuery = useCandidate(session.userId, candidateId)
  const projectQuery = useProject(session.userId, projectId)
  const projectCandidatesQuery = useCandidates(session.userId, { projectId }, Boolean(projectId))
  const candidate = candidateQuery.data ?? null
  const project = projectQuery.data ?? null
  const projectCandidates = projectCandidatesQuery.data ?? []
  const loading = candidateQuery.isPending || projectQuery.isPending || projectCandidatesQuery.isPending
  const error = candidateQuery.isError
    ? candidateQuery.error.message
    : projectQuery.isError
      ? projectQuery.error.message
      : projectCandidatesQuery.isError ? projectCandidatesQuery.error.message : null
  const role = requireCandidateWorkflowRole(session.appRole)
  const navigate = useNavigate()

  async function loadCandidate() {
    await invalidateWorkflow(queryClient, session.userId)
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
        <Link className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-md border button button-secondary px-[13px] font-extrabold no-underline" to={`/projects/${projectId}/pipeline/pre_interview`}>Project Pipeline</Link>
      </section>
    )
  }

  if (!candidate) throw new Error('Candidate query completed without candidate data')
  if (!project) throw new Error('Project query completed without project data')
  if (candidate.projectId !== projectId) throw new Error('Candidate does not belong to this project')

  const source = searchParams.get('source')
  if (source !== null && source !== 'rejection') throw new Error(`Unsupported candidate source route: ${source}`)
  const modal = searchParams.get('modal')
  if (modal !== null && !candidateModalNames.has(modal)) throw new Error(`Unsupported candidate modal: ${modal}`)

  const isRejectionFollowUp = source === 'rejection'
  if (isRejectionFollowUp && !candidate.rejectionFollowUp) {
    throw new Error(`Candidate ${candidate.id} has no rejection follow-up for the rejection source route`)
  }
  const closeTo = `/projects/${projectId}/candidates/${candidate.id}${isRejectionFollowUp ? '?source=rejection' : ''}`
  const pipelineReturnTo: unknown = location.state?.pipelineReturnTo
  if (pipelineReturnTo !== undefined && (
    typeof pipelineReturnTo !== 'string' ||
    !stageOrder.some((stage) => pipelineReturnTo.split(/[?#]/)[0] === `/projects/${projectId}/pipeline/${stage}`)
  )) throw new Error('Invalid pipeline return location')
  const cancelTo = pipelineReturnTo ?? closeTo
  const statusLabel = candidate.stage === 'pre_interview' && candidate.status === 'scheduled' ? 'Contact Successful' : statusLabels[candidate.status]
  const canShowNoteEditor = isRejectionFollowUp || !['rejected', 'withdrawn', 'offer_rejected'].includes(candidate.status)
  const hasOwnNote = candidate.notes.some((note) => note.author.id === session.userId)
  const saveNote = async (input: CandidateNoteInput) => {
    const updatedCandidate = await upsertCandidateNote(candidate.id, input)
    queryClient.setQueryData(candidateQueryKey(session.userId, candidate.id), updatedCandidate)
  }

  return (
    <>
      <div className="mx-auto grid w-full max-w-[1200px] gap-6 px-8 pt-10 pb-16 max-[760px]:px-3">
        <CandidateHeader candidate={candidate} statusLabel={statusLabel} />
        <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-6 max-[1100px]:grid-cols-1">
          <section className="grid min-w-0 gap-6">
            {candidate.status === 'scheduled' && candidate.interview && <ScheduledInterviewCard candidate={candidate} />}
            {candidate.notes.length > 0 && <InternalNotes candidate={candidate} role={role} session={session} onSave={saveNote} />}
            {canShowNoteEditor && !hasOwnNote && (
              <CandidateNoteEditor
                key={`${candidate.id}-${session.userId}`}
                role={role}
                session={session}
                candidate={candidate}
                onSave={saveNote}
              />
            )}
            <ActivityHistory candidate={candidate} />
          </section>

          <aside className="min-w-0">
            <QuickActions
              role={role}
              candidate={candidate}
              projectCandidates={projectCandidates}
              isRejectionFollowUp={isRejectionFollowUp}
              onChanged={loadCandidate}
            />
          </aside>
        </div>
      </div>

      {modal === 'contact-card' && <ContactCardModal candidate={candidate} closeTo={cancelTo} />}
      {modal === 'log-contact' && <LogContactAttemptModal candidate={candidate} closeTo={closeTo} cancelTo={cancelTo} onChanged={loadCandidate} />}
      {modal === 'rejection-contact' && <RejectionContactModal candidate={candidate} closeTo={closeTo} onChanged={loadCandidate} />}
      {modal === 'interim-update' && <InterimUpdateModal candidate={candidate} closeTo={closeTo} />}
      {modal === 'reject-confirm' && (
        <ConfirmationModal
          title="Are you sure?"
          body={`${candidate.name} will be rejected from ${stageLabels[candidate.stage]}.`}
          closeTo={closeTo}
          confirmTone="danger"
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
