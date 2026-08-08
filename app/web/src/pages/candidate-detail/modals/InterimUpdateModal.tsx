import { useNavigate } from 'react-router-dom'
import { RouteFormModal } from '../../../components/ui/RouteFormModal'
import { stageLabels } from '../../../domain/labels'
import type { Candidate } from '../../../domain/types'

export function InterimUpdateModal({ candidate, closeTo }: { candidate: Candidate; closeTo: string }) {
  const navigate = useNavigate()

  return (
    <RouteFormModal
      closeTo={closeTo}
      submitLabel="Save Update"
      subtitle={`${candidate.name} · ${stageLabels[candidate.stage]}`}
      title="Interim Update"
      onSubmit={() => navigate(closeTo)}
    >
      <div className="mb-[34px] grid gap-3.5">
        <h2 className="m-0 text-xs font-extrabold tracking-[0.12em] text-muted uppercase">Message</h2>
        <textarea className="min-h-[105px] w-full resize-y rounded border-0 bg-surface-muted px-4 py-3.5 text-sm leading-5 text-muted outline-0" placeholder="Add update sent to candidate..." />
      </div>
    </RouteFormModal>
  )
}
