import { ArrowRight, Download, Pencil, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { candidateTrackerRepository } from '../../data/repository'
import type { Project } from '../../domain/types'
import { ProjectFormModal } from './ProjectFormModal'

interface ProjectsPageProps {
  modal?: 'new' | 'edit'
}

export function ProjectsPage({ modal }: ProjectsPageProps) {
  const { projectId } = useParams()
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    candidateTrackerRepository.listProjects().then(setProjects)
  }, [])

  const active = projects.filter((project) => project.status === 'active')
  const archived = projects.filter((project) => project.status === 'archived')
  const selectedProject = projects.find((project) => project.id === projectId)

  return (
    <>
    <div className="projects-screen">
      <h1>Projects</h1>
      <div className="search-input"><span>⌕</span><input aria-label="Search project" placeholder="Search project..." /></div>

      <div className="figma-project-grid">
        {active.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}

        <Link className="figma-project-card archive-card" to="/projects">
          <StatusBadge type="project" status="archived" />
          <Download className="card-corner" size={20} />
          <div>
            <h3>Archived Projects ({archived.length})</h3>
            <p>View previously completed<br />hiring projects.</p>
          </div>
        </Link>

        <Link className="figma-project-card new-project-card" to="/projects/new">
          <div className="plus-tile"><Plus size={24} /></div>
          <div>
            <h3>Launch New Project</h3>
            <p>Ready to scale your team?</p>
          </div>
        </Link>
      </div>
    </div>
    {modal === 'new' && <ProjectFormModal mode="create" closeTo="/projects" />}
    {modal === 'edit' && selectedProject && <ProjectFormModal mode="edit" closeTo="/projects" project={selectedProject} />}
    </>
  )
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="figma-project-card">
      <Link className="card-hit-area" to={`/projects/${project.id}/pipeline/department_interview`} aria-label={`Open ${project.name}`} />
      <StatusBadge type="project" status={project.status} />
      <ArrowRight className="card-corner" size={22} />
      <div>
        <h3>{project.name}</h3>
        <p>{project.position}</p>
      </div>
      <div className="project-card-footer">
        <span className="avatar-stack"><span className="avatar avatar-sm">S</span><span className="count-pill">+{project.candidateCount}</span></span>
        <Link className="edit-project" to={`/projects/${project.id}/edit`}><Pencil size={13} /> Edit Project</Link>
      </div>
    </article>
  )
}
