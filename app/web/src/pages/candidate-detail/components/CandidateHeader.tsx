import { Link as LinkIcon } from 'lucide-react'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { Candidate } from '../../../domain/types'

interface CandidateHeaderProps {
  candidate: Candidate
  statusLabel: string
}

const profileButtonClasses = 'inline-flex h-11 min-w-[137px] items-center justify-center gap-[9px] rounded border-0 px-3.5 text-base font-bold no-underline'

export function CandidateHeader({ candidate, statusLabel }: CandidateHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-6">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <h1 className="m-0 break-words text-4xl leading-10 font-extrabold text-heading">{candidate.name}</h1>
        <StatusBadge label={statusLabel} tone={candidate.status} />
      </div>
      <div className="flex flex-wrap gap-3">
        {candidate.linkedinProfileUrl ? (
          <a className={`${profileButtonClasses} button button-secondary`} href={candidate.linkedinProfileUrl} target="_blank" rel="noreferrer">
            <LinkIcon size={16} />
            LinkedIn
          </a>
        ) : (
          <button className={`${profileButtonClasses} button button-secondary`} type="button" disabled>
            <LinkIcon size={16} />
            LinkedIn
          </button>
        )}
      </div>
    </div>
  )
}
