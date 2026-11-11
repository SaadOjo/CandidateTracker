import type { Candidate } from '../../../domain/types'
import { formatDateTime, getActivitySubtext } from '../candidateDetailHelpers'

export function ActivityHistory({ candidate }: { candidate: Candidate }) {
  const visible = [...candidate.activity].reverse()

  return (
    <section className="min-w-0 rounded-lg border border-border bg-white">
      <h2 className="m-0 border-b border-divider px-6 py-5 text-xs font-extrabold tracking-[0.12em] text-muted uppercase max-[760px]:px-4">Activity History</h2>
      {visible.length > 0 ? (
        <ol className="m-0 list-none p-0">
          {visible.map((item, index) => {
            const subtext = getActivitySubtext(item)
            return (
              <li className="grid min-h-[73px] grid-cols-[33px_minmax(0,1fr)_160px] items-center border-b border-divider px-6 py-4 last:border-b-0 max-[760px]:grid-cols-[24px_minmax(0,1fr)] max-[760px]:px-4" key={item.id}>
                <span className="text-[13px] font-extrabold text-faint">{visible.length - index}</span>
                <div>
                  <strong className="block text-sm leading-[19px] text-body">{item.title}</strong>
                  {subtext && <small className="mt-1 block text-[11px] text-body">{subtext}</small>}
                </div>
                <time className="text-right text-xs text-muted max-[760px]:col-start-2 max-[760px]:mt-1 max-[760px]:text-left">{formatDateTime(item.occurredAt)}</time>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="m-0 px-6 py-5 text-muted max-[760px]:px-4">No activity yet.</p>
      )}
    </section>
  )
}
