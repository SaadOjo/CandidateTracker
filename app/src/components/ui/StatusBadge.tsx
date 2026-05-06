import type { CandidateStatus, ProjectStatus } from '../../domain/types'
import { projectStatusLabels, statusLabels } from '../../domain/labels'

type ProjectBadgeStatus = ProjectStatus | 'candidate_accepted'

type Props =
  | { type: 'candidate'; status: CandidateStatus }
  | { type: 'project'; status: ProjectBadgeStatus }

export function StatusBadge(props: Props) {
  const label = props.type === 'candidate'
    ? statusLabels[props.status]
    : props.status === 'candidate_accepted'
      ? 'CANDIDATE ACCEPTED'
      : projectStatusLabels[props.status]

  return <span className={`status-badge status-badge--${props.status}`}>{label}</span>
}
