import { FileText, Link as LinkIcon } from 'lucide-react'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { Candidate } from '../../../domain/types'

interface CandidateHeaderProps {
  candidate: Candidate
  statusLabel: string
  onToggleResume: () => void
}

const profileButtonClasses = 'inline-flex h-11 min-w-[137px] items-center justify-center gap-[9px] rounded border-0 px-3.5 text-base font-bold no-underline'

export function CandidateHeader({ candidate, statusLabel, onToggleResume }: CandidateHeaderProps) {
  return (
    <div className="flex min-h-[97px] items-start justify-between">
      <div>
        <h1 className="m-0 text-4xl leading-10 font-extrabold text-heading">{candidate.name}</h1>
        <StatusBadge label={statusLabel} tone={candidate.status} />
      </div>
      <div className="mt-1.5 flex gap-3">
        {candidate.linkedinProfileUrl ? (
          <a className={`${profileButtonClasses} bg-surface-action text-ink`} href={candidate.linkedinProfileUrl} target="_blank" rel="noreferrer">
            <LinkIcon size={16} />
            LinkedIn
          </a>
        ) : (
          <button className={`${profileButtonClasses} bg-surface-action text-ink`} type="button" disabled>
            <LinkIcon size={16} />
            LinkedIn
          </button>
        )}
        <button className={`${profileButtonClasses} bg-action-primary text-white hover:bg-accent focus-visible:bg-accent`} type="button" onClick={onToggleResume}>
          <FileText size={16} />
          Resume
        </button>
      </div>
    </div>
  )
}
