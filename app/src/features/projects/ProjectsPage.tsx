import { ArrowRight, Download, Pencil, Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { type AppOutletContext } from '../../components/layout/AppLayout'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { candidateTrackerRepository } from '../../data/repository'
import type { Project } from '../../domain/types'
import { ProjectFormModal } from './ProjectFormModal'

interface ProjectsPageProps {
  modal?: 'new' | 'edit'
  view?: 'default' | 'archived'
}

export function ProjectsPage({ modal, view = 'default' }: ProjectsPageProps) {
  const { role } = useOutletContext<AppOutletContext>()
  const { projectId } = useParams()
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    candidateTrackerRepository.listProjects().then(setProjects)
  }, [])

  const active = projects.filter((project) => project.status === 'active')
  const archived = projects.filter((project) => project.status === 'archived')
  const selectedProject = projects.find((project) => project.id === projectId)
  const visibleProjects = view === 'archived' ? archived : active

  return (
    <>
    <div className="projects-screen">
      <h1>{view === 'archived' ? 'Archived Projects' : 'Projects'}</h1>
      <div className="search-input projects-search"><Search size={20} strokeWidth={2} /><input aria-label="Search project" placeholder={view === 'archived' ? 'Search archived project...' : 'Search project...'} /></div>

      <div className={`figma-project-grid ${view === 'archived' ? 'figma-project-grid--archived' : ''}`}>
        {visibleProjects.map((project) => (
          <ProjectCard key={project.id} project={project} role={role} />
        ))}

        {view === 'default' && <Link className="figma-project-card archive-card" to="/projects/archived">
          <StatusBadge type="project" status="archived" />
          <Download className="card-corner" size={20} />
          <div>
            <h3>Archived Projects ({archived.length})</h3>
            <p>View previously completed<br />hiring projects.</p>
          </div>
        </Link>}

        {view === 'default' && role === 'hr' && <Link className="figma-project-card new-project-card" to="/projects/new">
          <div className="plus-tile"><Plus size={24} /></div>
          <div>
            <h3>Launch New Project</h3>
            <p>Ready to scale your team?</p>
          </div>
        </Link>}
      </div>
    </div>
    {modal === 'new' && <ProjectFormModal mode="create" closeTo="/projects" />}
    {modal === 'edit' && selectedProject && <ProjectFormModal mode="edit" closeTo="/projects" project={selectedProject} />}
    </>
  )
}

function ProjectCard({ project, role }: { project: Project; role: AppOutletContext['role'] }) {
  const navigate = useNavigate()

  return (
    <article
      className="figma-project-card figma-project-card--clickable"
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/projects/${project.id}/pipeline/department_interview`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          navigate(`/projects/${project.id}/pipeline/department_interview`)
        }
      }}
    >
      <StatusBadge type="project" status={project.status} />
      <ArrowRight className="card-corner" size={22} />
      <div>
        <h3>{project.name}</h3>
        <p>{project.position}</p>
      </div>
      <div className="project-card-footer">
        <span className="avatar-stack"><span className="avatar avatar-sm">S</span><span className="count-pill">+{project.candidateCount}</span></span>
        {role === 'hr' && <Link className="edit-project" to={`/projects/${project.id}/edit`} onClick={(event) => event.stopPropagation()}><Pencil size={13} /> Edit Project</Link>}
      </div>
    </article>
  )
}
