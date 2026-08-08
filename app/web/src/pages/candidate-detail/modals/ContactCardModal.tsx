import { Mail, Phone } from 'lucide-react'
import type { ReactNode } from 'react'
import { RouteModal } from '../../../components/ui/RouteModal'
import type { Candidate } from '../../../domain/types'
import { formatSource } from '../candidateDetailHelpers'

export function ContactCardModal({ candidate, closeTo }: { candidate: Candidate; closeTo: string }) {
  return (
    <RouteModal closeTo={closeTo} showCloseButton>
      <section className="min-h-[354px] w-96 bg-white px-8 pt-[54px] pb-8 text-center max-[760px]:w-[min(100vw-32px,576px)]">
        <h1 className="mt-0 mb-0.5 text-2xl leading-8 font-extrabold text-ink">{candidate.name}</h1>
        <p className="mt-0 mb-[39px] text-[13px] text-body">{formatSource(candidate.source)} Candidate</p>
        <div className="mb-[35px] grid gap-4 text-left">
          <ContactInfoRow icon={<Mail size={18} />} label="Email" value={candidate.email ?? '—'} />
          <ContactInfoRow icon={<Phone size={18} />} label="Phone" value={candidate.phone ?? '—'} />
        </div>
        <div className="grid justify-items-center gap-2.5">
          <button className="h-10 w-[188px] rounded border-0 bg-surface-action text-xs font-extrabold text-ink" type="button" onClick={() => navigator.clipboard.writeText(candidate.email ?? '')}>Copy Email</button>
          <button className="h-10 w-[188px] rounded border-0 bg-surface-muted text-xs font-extrabold text-ink" type="button" onClick={() => navigator.clipboard.writeText(candidate.phone ?? '')}>Copy Phone</button>
        </div>
      </section>
    </RouteModal>
  )
}

function ContactInfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[40px_1fr] items-center gap-4">
      <span className="grid h-10 w-10 place-items-center rounded bg-surface-muted text-body">{icon}</span>
      <div>
        <small className="block text-[10px] font-extrabold tracking-[0.12em] text-muted uppercase">{label}</small>
        <strong className="block text-sm leading-5 text-ink">{value}</strong>
      </div>
    </div>
  )
}
