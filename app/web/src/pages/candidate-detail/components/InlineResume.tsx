import { FileText } from 'lucide-react'
import type { Candidate } from '../../../domain/types'
import { formatSource } from '../candidateDetailHelpers'

export function InlineResume({ candidate }: { candidate: Candidate }) {
  return (
    <section className="mt-7 grid min-h-[280px] w-[min(694px,100%)] content-start rounded-panel border border-border bg-white px-[18px] py-5">
      <button className="mb-[18px] ml-auto inline-flex h-[34px] w-fit items-center justify-center gap-2 rounded border-0 bg-surface-action px-3 text-xs font-extrabold text-ink" type="button">
        <FileText size={14} />
        Download
      </button>
      <h3 className="mt-0 mb-1.5 text-xl leading-7 font-extrabold text-ink">{candidate.name}</h3>
      <small className="mb-[18px] block text-xs text-muted">{formatSource(candidate.source)} Candidate</small>
      <ul className="m-0 pl-[18px] text-sm leading-6 text-body">
        <li>Relevant experience and profile details are represented by the linked candidate file.</li>
        <li>Communication, availability, and compensation notes belong in the internal notes section.</li>
        <li>Resume file storage is modeled separately and can be attached when file upload is implemented.</li>
      </ul>
    </section>
  )
}
