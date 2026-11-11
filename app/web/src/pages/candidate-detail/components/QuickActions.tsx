import { CheckCircle2, Phone, RotateCcw, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorMessage } from '../../../components/feedback/ErrorMessage'
import { transitionCandidate } from '../../../data/api'
import type { Candidate, CandidateTransitionAction } from '../../../domain/types'
import { getProcessActions, shouldShowProcess } from '../candidateDetailHelpers'
import { CollapsibleActionMenu } from './quick-actions/CollapsibleActionMenu'
import type { ActionMenuItem } from './quick-actions/CollapsibleActionMenu'

interface QuickActionsProps {
  role: 'human_resource' | 'hiring_manager'
  candidate: Candidate
  projectCandidates: Candidate[]
  isRejectionFollowUp: boolean
  onChanged: () => Promise<void>
}

const actionClasses = 'flex min-h-5 items-center gap-3 border-0 button button-text rounded px-2.5 text-left text-sm font-bold no-underline'

export function QuickActions({ role, candidate, projectCandidates, isRejectionFollowUp, onChanged }: QuickActionsProps) {
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
  const showRejectionHandling = isRejectionFollowUp && role === 'human_resource' && candidate.rejectionFollowUp && candidate.rejectionFollowUp.status !== 'handled'
  const showRejectionHandled = isRejectionFollowUp && candidate.rejectionFollowUp?.status === 'handled'
  const showContactInfo = !isRejectionFollowUp && role === 'human_resource' && candidate.stage !== 'pre_interview' && candidate.stage !== 'manager_review'
  const showContactLog = !isRejectionFollowUp && role === 'human_resource' && candidate.stage !== 'manager_review' && candidate.stage !== 'offer_stage'
  const showInterimUpdate = !isRejectionFollowUp && role === 'human_resource' && candidate.stage === 'manager_review' && candidate.status === 'waitlisted'
  const showOfferHandling = !isRejectionFollowUp && role === 'human_resource' && candidate.stage === 'offer_stage' && !hasAcceptedOfferCandidate && canManageOfferFlow

  if (!isRejectionFollowUp && (candidate.status === 'rejected' || candidate.status === 'withdrawn' || candidate.status === 'offer_rejected')) return null
  if (!showProcess && !showRejectionHandling && !showRejectionHandled && !showContactInfo && !showContactLog && !showInterimUpdate && !showOfferHandling) return null

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
    <section className="grid w-full min-w-0 content-start gap-5 rounded-lg border border-border bg-white p-6 max-[760px]:p-4">
      <h2 className="m-0 text-xs font-extrabold tracking-[0.12em] text-muted uppercase">Quick Actions</h2>
      {actionError && <ErrorMessage message={actionError} />}

      {showRejectionHandling && (
        <Link className={actionClasses} to={`${closeTo}${modalSeparator}modal=rejection-contact`}>
          <RotateCcw size={16} />
          Rejection Handling
        </Link>
      )}

      {showRejectionHandled && (
        <span className="flex min-h-5 items-center gap-3 px-2.5 text-sm font-bold text-success-strong">
          <CheckCircle2 size={16} />
          Rejection Handled
        </span>
      )}

      {showContactInfo && (
        <Link className={actionClasses} to={`${closeTo}?modal=contact-card`}>
          <Phone size={16} />
          Contact Info
        </Link>
      )}

      {showContactLog && (
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

      {showInterimUpdate && (
        <Link className={actionClasses} to={`${closeTo}?modal=interim-update`}>
          <RotateCcw size={16} />
          Interim Update
        </Link>
      )}

      {showOfferHandling && (
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
