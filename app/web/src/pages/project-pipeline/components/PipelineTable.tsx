import { Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LoadingState } from '../../../components/feedback/LoadingState'
import { Avatar } from '../../../components/ui/Avatar'
import { StatusIndicator } from '../../../components/ui/StatusIndicator'
import type { StatusIndicatorTone } from '../../../components/ui/StatusIndicator'
import { stageLabels, statusLabels } from '../../../domain/labels'
import type { Candidate, CandidateStatus, PipelineStage } from '../../../domain/types'
import { formatDate, formatTime, getOfferRankLabel, showAddLog } from '../pipelineHelpers'
import type { PipelineColumn } from '../pipelineHelpers'

interface PipelineTableProps {
  candidates: Candidate[]
  columns: PipelineColumn[]
  loading: boolean
  projectId: string
  role: 'human_resource' | 'hiring_manager'
  stage: PipelineStage
  totalCandidates: number
}

const statusTones: Record<CandidateStatus, StatusIndicatorTone> = {
  waiting_for_contact: 'muted',
  scheduled: 'accent',
  not_reached: 'danger',
  withdrawn: 'default',
  rejected: 'danger',
  assessment_sent: 'accent',
  waitlisted: 'accent-muted',
  approved_for_offer: 'accent-strong',
  final_check_sent: 'success',
  offer_sent: 'success',
  offer_rejected: 'muted',
  offer_accepted: 'success',
  proceeded_with_another_candidate: 'muted',
}

function getGridClasses(role: 'human_resource' | 'hiring_manager', stage: PipelineStage) {
  if (stage === 'pre_interview' || stage === 'manager_review' || (role === 'hiring_manager' && stage === 'offer_stage')) {
    return 'grid-cols-[minmax(250px,1.22fr)_minmax(150px,0.72fr)_minmax(132px,0.64fr)]'
  }
  if (role === 'hiring_manager' && (stage === 'department_interview' || stage === 'hr_interview')) {
    return 'grid-cols-[minmax(250px,1.22fr)_minmax(138px,0.72fr)_minmax(155px,0.78fr)_minmax(132px,0.64fr)]'
  }
  if (stage === 'department_interview' || stage === 'hr_interview') {
    return 'grid-cols-[minmax(230px,1.18fr)_minmax(135px,0.72fr)_minmax(84px,0.42fr)_minmax(150px,0.78fr)_minmax(132px,0.64fr)]'
  }
  return 'grid-cols-[minmax(250px,1.22fr)_minmax(138px,0.72fr)_minmax(84px,0.42fr)_minmax(132px,0.64fr)]'
}

export function PipelineTable({ candidates, columns, loading, projectId, role, stage, totalCandidates }: PipelineTableProps) {
  const gridClasses = getGridClasses(role, stage)
  const rowClasses = `grid min-h-[89px] min-w-0 items-center gap-x-[clamp(16px,1.6vw,24px)] px-[clamp(28px,3vw,48px)] ${gridClasses}`

  return (
    <section className="mx-auto mt-[30px] min-h-[507px] w-[min(1320px,calc(100vw-330px))] max-w-full overflow-x-auto overflow-y-hidden rounded-md bg-white max-[1100px]:w-[calc(100vw-48px)] max-[760px]:w-full">
      <div className={`${rowClasses} min-h-10 border-b border-divider text-[10px] font-extrabold tracking-[0.12em] text-body uppercase`}>
        {columns.includes('candidate') && <span className="flex justify-start text-left">Candidate Name</span>}
        {columns.includes('status') && <span className="flex justify-center text-center">Status</span>}
        {columns.includes('contact') && <span className="flex justify-center justify-self-center text-center">Contact</span>}
        {columns.includes('interview') && <span className="flex justify-center text-center">Interview Info</span>}
        {columns.includes('actions') && <span className="flex justify-center text-center">Actions</span>}
      </div>

      {loading ? (
        <LoadingState className="min-h-[180px] px-12 py-7" />
      ) : candidates.length > 0 ? (
        candidates.map((candidate, index) => (
          <div className={rowClasses} key={candidate.id}>
            {columns.includes('candidate') && (
              <Link className="flex items-center justify-self-start gap-3 pl-2 text-left text-inherit no-underline" to={`/projects/${projectId}/candidates/${candidate.id}`}>
                {stage === 'offer_stage' && getOfferRankLabel(index) && <small>{getOfferRankLabel(index)}</small>}
                <Avatar name={candidate.name} />
                <div>
                  <strong className="block text-sm leading-5 text-heading">{candidate.name}</strong>
                  <small className="block text-[13px] leading-[18px] text-muted">{candidate.appliedAgo ?? 'Imported candidate'}</small>
                </div>
              </Link>
            )}
            {columns.includes('status') && <StatusCell candidate={candidate} stage={stage} />}
            {columns.includes('contact') && <ContactCell candidate={candidate} />}
            {columns.includes('interview') && <InterviewCell candidate={candidate} />}
            {columns.includes('actions') && (
              <div className="flex items-center justify-self-center gap-2.5">
                <Link className="inline-flex h-[30px] min-w-14 items-center justify-center rounded-sm border border-border bg-white px-2.5 text-xs font-extrabold text-heading no-underline" to={`/projects/${projectId}/candidates/${candidate.id}`}>View</Link>
                {showAddLog(role, stage, candidate.status) && (
                  <Link className="inline-flex h-[30px] min-w-14 items-center justify-center rounded-sm border-0 bg-action-primary px-2.5 text-xs font-extrabold text-white no-underline" to={`/projects/${projectId}/candidates/${candidate.id}?modal=log-contact`}>
                    Add Log
                  </Link>
                )}
              </div>
            )}
          </div>
        ))
      ) : (
        <p className="m-0 flex min-h-[180px] items-center gap-2 px-12 py-7 text-muted">No candidates in this stage.</p>
      )}

      <footer className="flex h-[59px] items-center bg-surface-subtle px-8 text-[13px] text-muted">
        <span>
          Showing {candidates.length} candidates in {stageLabels[stage]} · {totalCandidates} total in project
        </span>
      </footer>
    </section>
  )
}

function StatusCell({ candidate, stage }: { candidate: Candidate; stage: PipelineStage }) {
  if (stage === 'manager_review' && candidate.status === 'waiting_for_contact') return <span className="text-xs text-muted">--</span>
  const status = stage === 'pre_interview' && candidate.status === 'scheduled' ? 'Contact Successful' : statusLabels[candidate.status]
  const tone = stage === 'pre_interview' && candidate.status === 'scheduled'
    ? 'accent'
    : statusTones[candidate.status]
  if (!status) throw new Error(`Unsupported candidate status label: ${String(candidate.status)}`)
  if (!tone) throw new Error(`Unsupported candidate status tone: ${String(candidate.status)}`)

  return <StatusIndicator className="justify-self-center text-[13px] font-extrabold" label={status} tone={tone} />
}

function ContactCell({ candidate }: { candidate: Candidate }) {
  return (
    <Link className="flex h-8 w-8 items-center justify-center justify-self-center" to={`/projects/${candidate.projectId}/candidates/${candidate.id}?modal=contact-card`} aria-label={`Open contact info for ${candidate.name}`}>
      <Phone className="text-muted" size={22} strokeWidth={1.8} />
    </Link>
  )
}

function InterviewCell({ candidate }: { candidate: Candidate }) {
  if (candidate.status === 'withdrawn') return <span className="justify-self-center text-xs text-muted">Terminated</span>
  if (!candidate.interview) return <span className="justify-self-center text-xs text-muted">--</span>
  return (
    <span className="grid justify-self-center text-center leading-[18px] text-ink">
      <strong className="text-sm font-bold">{formatDate(candidate.interview.date)}</strong>
      <small className="text-xs text-muted">{formatTime(candidate.interview.date)}</small>
    </span>
  )
}
