import { ChevronDown } from 'lucide-react'
import { SearchField } from '../../../components/ui/SearchField'
import type { Project } from '../../../domain/types'
import type { RejectionStatusFilter } from '../rejectionFollowUpHelpers'

interface RejectionFiltersProps {
  query: string
  projectFilter: string
  statusFilter: RejectionStatusFilter
  projects: Project[]
  projectMenuOpen: boolean
  statusMenuOpen: boolean
  onQueryChange: (value: string) => void
  onProjectFilterChange: (value: string) => void
  onStatusFilterChange: (value: RejectionStatusFilter) => void
  onToggleProjectMenu: () => void
  onToggleStatusMenu: () => void
}

const filterButtonClasses = 'inline-flex h-11 items-center gap-[42px] rounded border-0 button button-secondary px-4 font-bold'
const menuClasses = 'absolute top-[calc(100%+8px)] left-0 z-30 grid min-w-[220px] max-w-[360px] gap-1.5 rounded-lg border border-border bg-white p-2 shadow-popover'
const menuButtonClasses = 'flex h-auto w-full items-center justify-between gap-3 rounded border-0 control-selectable px-3 py-2.5 text-left text-[13px] font-semibold'

export function RejectionFilters({
  query,
  projectFilter,
  statusFilter,
  projects,
  projectMenuOpen,
  statusMenuOpen,
  onQueryChange,
  onProjectFilterChange,
  onStatusFilterChange,
  onToggleProjectMenu,
  onToggleStatusMenu,
}: RejectionFiltersProps) {
  const selectedProject = projectFilter === 'all'
    ? null
    : projects.find((project) => project.id === projectFilter)
  if (projectFilter !== 'all' && !selectedProject) {
    throw new Error(`Selected rejection project does not exist: ${projectFilter}`)
  }
  const selectedStatusLabel = getStatusFilterLabel(statusFilter)

  return (
    <div className="mb-10 ml-5 flex items-center gap-3 max-[1100px]:mr-5 max-[1100px]:flex-wrap max-[760px]:ml-3">
      <SearchField
        className="mr-[90px] w-[448px] max-[1100px]:mr-0 max-[760px]:w-full"
        iconSize={20}
        padding="compact"
        placeholder="Search candidate name..."
        value={query}
        onChange={onQueryChange}
      />

      <div className="relative">
        <button className={filterButtonClasses} type="button" aria-expanded={projectMenuOpen} onClick={onToggleProjectMenu}>
          <span>Projects: {selectedProject ? selectedProject.name : 'All'}</span>
          <ChevronDown className={`transition-transform ${projectMenuOpen ? 'rotate-180' : ''}`} size={16} />
        </button>
        {projectMenuOpen && (
          <div className={`${menuClasses} max-h-80 overflow-y-auto`}>
            <button className={menuButtonClasses} aria-pressed={projectFilter === 'all'} type="button" onClick={() => onProjectFilterChange('all')}>
              Projects: All
            </button>
            {projects.map((project) => (
              <button className={menuButtonClasses} aria-pressed={projectFilter === project.id} key={project.id} type="button" onClick={() => onProjectFilterChange(project.id)}>
                <span>{formatProjectStatus(project)} — {project.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <button className={filterButtonClasses} type="button" aria-expanded={statusMenuOpen} onClick={onToggleStatusMenu}>
          <span>Status: {selectedStatusLabel}</span>
          <ChevronDown className={`transition-transform ${statusMenuOpen ? 'rotate-180' : ''}`} size={16} />
        </button>
        {statusMenuOpen && (
          <div className={menuClasses}>
            <button className={menuButtonClasses} aria-pressed={statusFilter === 'all'} type="button" onClick={() => onStatusFilterChange('all')}>Status: All</button>
            <button className={menuButtonClasses} aria-pressed={statusFilter === 'waiting_for_contact'} type="button" onClick={() => onStatusFilterChange('waiting_for_contact')}>Waiting for Contact</button>
            <button className={menuButtonClasses} aria-pressed={statusFilter === 'handled'} type="button" onClick={() => onStatusFilterChange('handled')}>Rejection Handled</button>
          </div>
        )}
      </div>
    </div>
  )
}

function formatProjectStatus(project: Project) {
  if (project.status === 'active') return 'Active'
  if (project.status === 'archived') return 'Archived'
  if (project.status === 'closed') return 'Closed'
  throw new Error(`Unsupported project status: ${String(project.status)}`)
}

function getStatusFilterLabel(status: RejectionStatusFilter) {
  if (status === 'all') return 'All'
  if (status === 'waiting_for_contact') return 'Waiting for Contact'
  if (status === 'handled') return 'Rejection Handled'
  throw new Error(`Unsupported rejection status filter: ${String(status)}`)
}
