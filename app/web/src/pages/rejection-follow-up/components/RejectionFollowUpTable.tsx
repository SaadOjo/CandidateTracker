import { Link } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { StatusIndicator } from '../../../components/ui/StatusIndicator'
import type { RejectionFollowUp } from '../../../domain/types'
import { formatEligibleDate, getRejectionDisplayStatus } from '../rejectionFollowUpHelpers'

interface RejectionFollowUpTableProps {
  rows: RejectionFollowUp[]
  total: number
}

const rowClasses = 'grid min-h-[88px] min-w-[1168px] grid-cols-[300px_200px_190px_180px_120px] items-center justify-items-center gap-x-5 px-8 text-xs'

export function RejectionFollowUpTable({ rows, total }: RejectionFollowUpTableProps) {
  return (
    <section className="w-[1168px] max-w-full overflow-x-auto rounded-md border border-divider bg-white">
      <div className={`${rowClasses} min-h-10 border-b border-divider text-[10px] font-bold tracking-[0.12em] text-body uppercase`}>
        <span className="justify-self-start pl-2 text-left">Candidate Name</span>
        <span>Project Name</span>
        <span>Status</span>
        <span>Eligible Date</span>
        <span>Actions</span>
      </div>

      {rows.map((followUp) => {
        const status = getRejectionDisplayStatus(followUp)
        const handled = status === 'handled'

        return (
          <div className={`${rowClasses} border-b border-divider last:border-b-0`} key={followUp.id}>
            <div className="flex items-center gap-3.5 justify-self-start pl-2 text-left">
              <Avatar name={followUp.candidate.name} size="large" />
              <strong className="text-sm leading-5 text-heading">{followUp.candidate.name.replaceAll('.', '')}</strong>
            </div>
            <span className="text-center text-[10px] leading-3.5 font-bold text-ink">{followUp.project.name}</span>
            <StatusIndicator
              className={handled ? 'font-bold' : 'font-medium'}
              label={handled ? 'Rejection Handled' : 'Waiting for Contact'}
              tone={handled ? 'default' : 'muted'}
            />
            <time dateTime={followUp.eligibleAt}>{formatEligibleDate(followUp.eligibleAt)}</time>
            <Link
              className="inline-flex h-[30px] min-w-14 items-center justify-center rounded-sm border border-border bg-white text-xs font-bold text-heading no-underline"
              to={`/projects/${followUp.projectId}/candidates/${followUp.candidate.id}?source=rejection`}
            >
              View
            </Link>
          </div>
        )
      })}

      {rows.length === 0 && (
        <div className="grid min-h-[120px] min-w-[1168px] place-items-center px-8 text-sm text-muted">
          No rejection follow-ups match these filters.
        </div>
      )}

      <footer className="flex h-[59px] min-w-[1168px] items-center bg-surface-subtle px-8 pr-[88px] text-[13px] text-muted">
        <span>Showing {rows.length} of {total} candidates</span>
      </footer>
    </section>
  )
}
