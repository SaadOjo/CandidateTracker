import { CalendarDays, Copy } from 'lucide-react'
import type { Candidate } from '../../../domain/types'
import { formatDateTime, formatTime } from '../candidateDetailHelpers'

export function ScheduledInterviewCard({ candidate }: { candidate: Candidate }) {
  const interview = candidate.interview
  if (!interview) return null

  return (
    <section className="grid min-w-0 grid-cols-[48px_minmax(0,1fr)] items-center gap-4 rounded-lg border border-border bg-white p-6 max-[760px]:p-4">
      <div className="grid h-12 w-12 place-items-center rounded-lg bg-white text-body">
        <CalendarDays size={18} />
      </div>
      <div>
        <strong className="block text-base font-extrabold text-ink">{interview.title}</strong>
        <p className="mt-1 mb-0 text-sm leading-5 text-body">{formatDateTime(interview.date)}</p>
        <p className="mt-1 mb-0 text-sm leading-5 text-body">{formatTime(interview.date)} · {interview.timezone}</p>
      </div>
      {interview.meetingUrl && (
        <button className="col-start-2 inline-flex min-h-[34px] w-fit items-center justify-center gap-2 rounded border-0 button button-secondary px-3 text-xs font-extrabold" type="button" onClick={() => navigator.clipboard.writeText(interview.meetingUrl ?? '')}>
          <Copy size={14} />
          Copy Meeting URL
        </button>
      )}
    </section>
  )
}
