import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorMessage } from '../../components/feedback/ErrorMessage'
import { stageLabels } from '../../domain/labels'
import { useCandidate } from '../queries/useCandidate'
import { useProject } from '../queries/useProject'

const crumbClasses = 'pt-[3px] leading-7'
const mutedCrumbClasses = `${crumbClasses} text-muted no-underline`
const activeCrumbClasses = `${crumbClasses} border-b-2 border-heading font-bold text-heading`

export function Breadcrumbs({
  currentUserId,
  pathname,
  search,
}: {
  currentUserId: string
  pathname: string
  search: string
}) {
  const projectId = pathname.match(/\/projects\/([^/]+)/)?.[1]
  const candidateId = pathname.match(/\/candidates\/([^/?]+)/)?.[1]
  const stage = pathname.match(/\/pipeline\/([^/?]+)/)?.[1]
  const isRejection = pathname.startsWith('/rejection-follow-up')
  const isRejectionSource = new URLSearchParams(search).get('source') === 'rejection'
  const isPipeline = pathname.includes('/pipeline/')
  const isProjectsRoute = pathname === '/'
    || pathname === '/projects'
    || pathname === '/projects/archived'
    || pathname === '/projects/new'
  const canLoadProject = Boolean(projectId && projectId !== 'new' && projectId !== 'archived')
  const projectQuery = useProject(currentUserId, projectId ?? '', canLoadProject)
  const candidateQuery = useCandidate(currentUserId, candidateId ?? '', Boolean(candidateId))
  const project = projectQuery.data ?? null
  const candidate = candidateQuery.data ?? null

  if (isRejectionSource && !candidateId) {
    throw new Error('Rejection-source breadcrumb requires a candidate ID')
  }
  if (canLoadProject && projectQuery.isPending) return <span role="status">Loading project breadcrumb</span>
  if (candidateId && candidateQuery.isPending) return <span role="status">Loading candidate breadcrumb</span>
  if (canLoadProject && projectQuery.isError) return <ErrorMessage message={`Could not load project breadcrumb: ${projectQuery.error.message}`} />
  if (candidateId && candidateQuery.isError) return <ErrorMessage message={`Could not load candidate breadcrumb: ${candidateQuery.error.message}`} />
  if (canLoadProject && !project) throw new Error('Project breadcrumb query completed without project data')
  if (candidateId && !candidate) throw new Error('Candidate breadcrumb query completed without candidate data')
  if (isRejectionSource && !candidate) throw new Error('Rejection-source breadcrumb has no candidate data')
  const rejectionSourceCandidate = isRejectionSource ? candidate : null

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3 break-words text-base text-muted" aria-label="Breadcrumb">
      {isRejection ? (
        <span className={activeCrumbClasses}>Rejection Follow-Up</span>
      ) : rejectionSourceCandidate ? (
        <>
          <Link className={mutedCrumbClasses} to="/rejection-follow-up">Rejection Follow-Up</Link>
          <ChevronRight size={16} />
          <span className={activeCrumbClasses}>{rejectionSourceCandidate.name}</span>
        </>
      ) : (
        <>
          <Link className={mutedCrumbClasses} to="/projects">Projects</Link>
          {project && (
            <>
              <ChevronRight size={16} />
              {isPipeline ? (
                <span className={activeCrumbClasses}>{project.name}</span>
              ) : (
                <Link className={mutedCrumbClasses} to={`/projects/${project.id}/pipeline/${candidate ? candidate.stage : 'pre_interview'}`}>
                  {project.name}
                </Link>
              )}
            </>
          )}
          {candidate && (
            <>
              <ChevronRight size={16} />
              <Link className={mutedCrumbClasses} to={`/projects/${projectId}/pipeline/${candidate.stage}`}>
                {stageLabels[candidate.stage]}
              </Link>
              <ChevronRight size={16} />
              <span className={activeCrumbClasses}>{candidate.name}</span>
            </>
          )}
          {!project && !candidate && (
            <>
              <ChevronRight size={16} />
              <span className={activeCrumbClasses}>
                {stage && isPipeline ? 'Project Pipeline' : isProjectsRoute ? 'Projects' : 'Route Not Found'}
              </span>
            </>
          )}
        </>
      )}
    </div>
  )
}
