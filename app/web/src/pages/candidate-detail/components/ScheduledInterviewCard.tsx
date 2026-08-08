import { CalendarDays, Copy } from 'lucide-react'
import type { Candidate } from '../../../domain/types'
import { formatDateTime, formatTime } from '../candidateDetailHelpers'

export function ScheduledInterviewCard({ candidate }: { candidate: Candidate }) {
  const interview = candidate.interview
  if (!interview) return null

  return (
    <section className="mt-7 grid w-[min(694px,100%)] grid-cols-[48px_1fr_auto] items-center gap-[18px] rounded-panel bg-surface-muted px-[22px] py-5 max-[760px]:grid-cols-1">
      <div className="grid h-12 w-12 place-items-center rounded-lg bg-white text-body">
        <CalendarDays size={18} />
      </div>
      <div>
        <strong className="block text-base font-extrabold text-ink">{interview.title}</strong>
        <p className="mt-1 mb-0 text-sm leading-5 text-body">{formatDateTime(interview.date)}</p>
        <p className="mt-1 mb-0 text-sm leading-5 text-body">{formatTime(interview.date)} · {interview.timezone}</p>
      </div>
      {interview.meetingUrl && (
        <button className="inline-flex h-[34px] w-fit items-center justify-center gap-2 rounded border-0 bg-surface-action px-3 text-xs font-extrabold text-ink" type="button" onClick={() => navigator.clipboard.writeText(interview.meetingUrl ?? '')}>
          <Copy size={14} />
          Copy Meeting URL
        </button>
      )}
    </section>
  )
}
