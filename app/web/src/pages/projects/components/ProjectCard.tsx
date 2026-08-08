import { ArrowRight, Pencil } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { projectStatusLabels } from '../../../domain/labels'
import type { Project } from '../../../domain/types'

interface ProjectCardProps {
  project: Project
  canManage: boolean
}

export function ProjectCard({ project, canManage }: ProjectCardProps) {
  const badgeLabel =
    project.status === 'active' && project.hasAcceptedOffer
      ? projectStatusLabels.candidate_accepted
      : projectStatusLabels[project.status]
  const badgeTone = project.status === 'active' && project.hasAcceptedOffer ? 'success' : project.status
  const archivedClasses = project.status === 'archived' ? 'border-border-strong bg-surface-subtle' : 'border-divider bg-white'

  return (
    <article className={`relative flex min-h-[236px] flex-col justify-between rounded-lg border p-6 ${archivedClasses}`}>
      <StatusBadge label={badgeLabel} tone={badgeTone} />
      <Link
        className="absolute top-[22px] right-[22px] inline-flex h-[34px] w-[34px] items-center justify-center rounded-md text-muted no-underline hover:bg-surface-muted"
        to={`/projects/${project.id}/pipeline/pre_interview`}
        aria-label={project.name}
      >
        <ArrowRight size={22} />
      </Link>
      <div>
        <h3 className="mt-[22px] mb-1.5 text-xl leading-tight font-bold text-ink">{project.name}</h3>
        <p className="m-0 text-sm leading-[1.45] text-body">{project.position}</p>
      </div>
      <div className="flex items-center justify-between gap-3.5">
        <span className="inline-flex items-center" aria-label={`${project.candidateCount} candidates`}>
          <Avatar name={project.hiringManager} />
          <span className="-ml-[5px] inline-flex h-7 min-w-7 items-center rounded-lg bg-surface-info px-2 text-xs font-extrabold text-body">
            {project.candidateCount}
          </span>
        </span>
        {canManage && project.status === 'active' && (
          <Link
            className="inline-flex min-h-8 items-center justify-center gap-2 rounded-md border border-border-strong bg-white px-2.5 text-xs font-extrabold text-ink no-underline"
            to={`/projects/${project.id}/edit`}
          >
            <Pencil size={14} />
            Edit
          </Link>
        )}
      </div>
    </article>
  )
}
