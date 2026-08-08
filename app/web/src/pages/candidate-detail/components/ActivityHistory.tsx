import type { Candidate } from '../../../domain/types'
import { formatDateTime, getActivitySubtext } from '../candidateDetailHelpers'

export function ActivityHistory({ candidate }: { candidate: Candidate }) {
  const visible = [...candidate.activity].reverse()

  return (
    <section className="mt-10 w-[min(694px,100%)]">
      <h2 className="mt-0 mb-[27px] flex items-center gap-2 text-xs font-extrabold tracking-[0.12em] text-faint uppercase"><i className="h-1.5 w-1.5 rounded-full bg-divider-strong" />Activity History</h2>
      {visible.length > 0 ? (
        <ol className="m-0 list-none overflow-hidden rounded-compact bg-white p-0">
          {visible.map((item, index) => {
            const subtext = getActivitySubtext(item)
            return (
              <li className="grid min-h-[73px] grid-cols-[33px_1fr_160px] items-center border-b border-divider px-4 py-2.5 last:border-b-0" key={item.id}>
                <span className="text-[13px] font-extrabold text-faint">{visible.length - index}</span>
                <div>
                  <strong className="block text-sm leading-[19px] text-body">{item.title}</strong>
                  {subtext && <small className="mt-1 block text-[11px] text-body">{subtext}</small>}
                </div>
                <time className="text-right text-xs text-muted">{formatDateTime(item.occurredAt)}</time>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="m-0 flex items-center gap-2 text-muted">No activity yet.</p>
      )}
    </section>
  )
}
