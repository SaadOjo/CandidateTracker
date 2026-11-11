import { Download } from 'lucide-react'
import { useState } from 'react'
import type { Project } from '../../../../domain/types'

interface ArchiveProjectActionProps {
  project: Project
  submitting: boolean
  onConfirm: () => void | Promise<void>
}

const secondaryButtonClasses = 'inline-flex min-h-[38px] items-center justify-center gap-2 rounded-md border button button-secondary px-[13px] font-extrabold no-underline'

export function ArchiveProjectAction({ project, submitting, onConfirm }: ArchiveProjectActionProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div className="relative">
      <button type="button" className={secondaryButtonClasses} onClick={() => setConfirmOpen(true)}>
        <Download size={15} />
        Archive Project
      </button>
      {confirmOpen && (
        <div className="absolute top-[calc(100%+10px)] left-0 z-[2] grid w-[min(360px,calc(100vw-56px))] gap-3 rounded-lg border border-border bg-white p-[18px] shadow-popover">
          <h3 className="m-0 text-sm font-bold text-ink">Archive this project?</h3>
          <p className="m-0 text-[13px] leading-[1.45] text-body">
            {project.hasAcceptedOffer
              ? 'This project has an accepted offer and will move to Archived Projects.'
              : 'This project has no accepted offer yet and will move to Archived Projects.'}
          </p>
          <div className="flex justify-end gap-2.5">
            <button className="min-h-[34px] rounded-md button button-secondary border px-3" type="button" onClick={() => setConfirmOpen(false)}>
              Cancel
            </button>
            <button
              className="inline-flex min-h-[34px] items-center justify-center gap-2 rounded-md border button button-danger px-3 font-extrabold"
              type="button"
              onClick={() => void onConfirm()}
              disabled={submitting}
            >
              Archive
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
