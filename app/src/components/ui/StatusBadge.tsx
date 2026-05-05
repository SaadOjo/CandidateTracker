import type { CandidateStatus, ProjectStatus } from '../../domain/types'
import { projectStatusLabels, statusLabels } from '../../domain/labels'

type Props =
  | { type: 'candidate'; status: CandidateStatus }
  | { type: 'project'; status: ProjectStatus }

export function StatusBadge(props: Props) {
  const label = props.type === 'candidate' ? statusLabels[props.status] : projectStatusLabels[props.status]
  return <span className={`status-badge status-badge--${props.status}`}>{label}</span>
}
