import { CheckCircle2, Phone, RotateCcw, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorMessage } from '../../../components/feedback/ErrorMessage'
import { transitionCandidate } from '../../../data/api'
import type { AuthSession, Candidate, CandidateNoteInput, CandidateTransitionAction } from '../../../domain/types'
import { getProcessActions, notifyCandidateChanged, shouldShowProcess } from '../candidateDetailHelpers'
import { CandidateNoteEditor } from './quick-actions/CandidateNoteEditor'
import { CollapsibleActionMenu } from './quick-actions/CollapsibleActionMenu'
import type { ActionMenuItem } from './quick-actions/CollapsibleActionMenu'

interface QuickActionsProps {
  role: 'human_resource' | 'hiring_manager'
  session: AuthSession
  candidate: Candidate
  projectCandidates: Candidate[]
  isRejectionFollowUp: boolean
  onSaveNote: (input: CandidateNoteInput) => Promise<void>
  onChanged: () => Promise<void>
}

const actionClasses = 'flex min-h-5 items-center gap-3 border-0 bg-transparent px-2.5 text-left text-sm font-bold text-ink no-underline'

export function QuickActions({ role, session, candidate, projectCandidates, isRejectionFollowUp, onSaveNote, onChanged }: QuickActionsProps) {
  const [processOpen, setProcessOpen] = useState(false)
  const [offerOpen, setOfferOpen] = useState(false)
  const [busyAction, setBusyAction] = useState<CandidateTransitionAction | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const offerStageCandidates = projectCandidates.filter((item) => item.stage === 'offer_stage')
  const hasAcceptedOfferCandidate = offerStageCandidates.some((item) => item.status === 'offer_accepted')
  const hasOfferSentCandidate = offerStageCandidates.some((item) => item.status === 'offer_sent')
  const firstOfferActionCandidate = offerStageCandidates.find((item) => item.status === 'approved_for_offer' || item.status === 'final_check_sent')
  const canManageOfferFlow = candidate.status === 'offer_sent' || (!hasOfferSentCandidate && firstOfferActionCandidate?.id === candidate.id)
  const showProcess = !isRejectionFollowUp && shouldShowProcess(candidate, role)
  const processActions: ActionMenuItem[] = [
    ...getProcessActions(candidate, role).map((item) => ({ ...item, tone: 'default' as const })),
    { action: 'reject', label: 'Reject', tone: 'danger' },
  ]
  const offerActions: ActionMenuItem[] = []
  if (candidate.status === 'approved_for_offer') offerActions.push({ action: 'send_final_check', label: 'Send Final Check' })
  if (candidate.status === 'final_check_sent') offerActions.push({ action: 'send_offer', label: 'Send Offer', tone: 'accent' })
  if (candidate.status === 'offer_sent') offerActions.push({ action: 'offer_accepted', label: 'Offer Accepted', tone: 'accent' })
  offerActions.push({ action: 'reject', label: 'Reject', tone: 'danger' })
  const closeTo = `/projects/${candidate.projectId}/candidates/${candidate.id}${isRejectionFollowUp ? '?source=rejection' : ''}`
  const modalSeparator = isRejectionFollowUp ? '&' : '?'

  if (!isRejectionFollowUp && (candidate.status === 'rejected' || candidate.status === 'withdrawn' || candidate.status === 'offer_rejected')) return null

  async function runTransition(action: CandidateTransitionAction) {
    setActionError(null)
    setBusyAction(action)
    try {
      await transitionCandidate(candidate.id, action)
      setProcessOpen(false)
      setOfferOpen(false)
      await onChanged()
      notifyCandidateChanged()
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : 'Could not update candidate')
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <section className="grid w-[327px] content-start gap-5 rounded-panel bg-surface-action px-[25px] py-6">
      <span className="text-[11px] font-extrabold tracking-[0.08em] text-muted uppercase">Quick Actions</span>
      {actionError && <ErrorMessage message={actionError} />}

      <CandidateNoteEditor
        candidate={candidate}
        role={role}
        session={session}
        onError={setActionError}
        onSave={onSaveNote}
      />

      {isRejectionFollowUp && role === 'human_resource' && candidate.rejectionFollowUp && candidate.rejectionFollowUp.status !== 'handled' && (
        <Link className={actionClasses} to={`${closeTo}${modalSeparator}modal=rejection-contact`}>
          <RotateCcw size={16} />
          Rejection Handling
        </Link>
      )}

      {isRejectionFollowUp && candidate.rejectionFollowUp?.status === 'handled' && (
        <span className={`${actionClasses} text-success-strong`}>
          <CheckCircle2 size={16} />
          Rejection Handled
        </span>
      )}

      {!isRejectionFollowUp && role === 'human_resource' && candidate.stage !== 'pre_interview' && candidate.stage !== 'manager_review' && (
        <Link className={actionClasses} to={`${closeTo}?modal=contact-card`}>
          <Phone size={16} />
          Contact Info
        </Link>
      )}

      {!isRejectionFollowUp && role === 'human_resource' && candidate.stage !== 'manager_review' && candidate.stage !== 'offer_stage' && (
        <Link className={actionClasses} to={`${closeTo}?modal=log-contact`}>
          <RotateCcw size={16} />
          {candidate.stage === 'pre_interview' ? 'Add Log' : 'Log Contact Attempt'}
        </Link>
      )}

      {showProcess && (
        <CollapsibleActionMenu
          busyAction={busyAction}
          icon={<Search size={16} />}
          items={processActions}
          label="Process"
          open={processOpen}
          onSelect={(action) => void runTransition(action)}
          onToggle={() => setProcessOpen((open) => !open)}
        />
      )}

      {!isRejectionFollowUp && role === 'human_resource' && candidate.stage === 'manager_review' && candidate.status === 'waitlisted' && (
        <Link className={actionClasses} to={`${closeTo}?modal=interim-update`}>
          <RotateCcw size={16} />
          Interim Update
        </Link>
      )}

      {!isRejectionFollowUp && role === 'human_resource' && candidate.stage === 'offer_stage' && !hasAcceptedOfferCandidate && canManageOfferFlow && (
        <CollapsibleActionMenu
          busyAction={busyAction}
          icon={<Search size={16} />}
          items={offerActions}
          label="Offer Handling"
          open={offerOpen}
          onSelect={(action) => void runTransition(action)}
          onToggle={() => setOfferOpen((open) => !open)}
        />
      )}
    </section>
  )
}
