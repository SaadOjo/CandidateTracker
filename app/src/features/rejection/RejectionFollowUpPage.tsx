import { ChevronDown, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { candidateTrackerRepository } from '../../data/repository'
import type { Candidate, Project } from '../../domain/types'

type RejectionStatusFilter = 'all' | 'waiting_for_contact' | 'handled'

export function RejectionFollowUpPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [query, setQuery] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<RejectionStatusFilter>('all')
  const [projectMenuOpen, setProjectMenuOpen] = useState(false)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)

  useEffect(() => {
    candidateTrackerRepository.listCandidates().then((items) => {
      setCandidates(items.filter((candidate) => candidate.status === 'rejected' || candidate.status === 'proceeded_with_another_candidate'))
    })
    candidateTrackerRepository.listProjects().then(setProjects)
  }, [])

  const rejectionRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return candidates
      .map((candidate) => ({
        candidate,
        status: candidate.status === 'proceeded_with_another_candidate' || candidate.id === 'c-marcus' ? 'handled' : 'waiting_for_contact' as RejectionStatusFilter,
      }))
      .filter(({ candidate, status }) => {
        if (normalizedQuery && !candidate.name.toLowerCase().includes(normalizedQuery)) return false
        if (projectFilter !== 'all' && candidate.projectId !== projectFilter) return false
        if (statusFilter !== 'all' && status !== statusFilter) return false
        return true
      })
      .sort((left, right) => {
        const getPriority = (status: RejectionStatusFilter) => status === 'waiting_for_contact' ? 0 : 1
        return getPriority(left.status) - getPriority(right.status)
      })
  }, [candidates, projectFilter, query, statusFilter])

  return (
    <div className="rejection-screen">
      <h1>Rejection Follow-Up</h1>
      <div className="rejection-controls">
        <div className="search-input rejection-search"><Search size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search candidate name..." /></div>
        <div className="rejection-filter-wrap">
          <button onClick={() => setProjectMenuOpen((open) => !open)}>Projects: {projectFilter === 'all' ? 'All' : projects.find((project) => project.id === projectFilter)?.name ?? 'All'} <ChevronDown size={16} /></button>
          {projectMenuOpen && <div className="rejection-filter-menu">
            <button className={projectFilter === 'all' ? 'active' : ''} onClick={() => { setProjectFilter('all'); setProjectMenuOpen(false) }}>Projects: All</button>
            {projects.map((project) => <button className={projectFilter === project.id ? 'active' : ''} key={project.id} onClick={() => { setProjectFilter(project.id); setProjectMenuOpen(false) }}>{project.status === 'archived' ? 'Archived' : 'Active'} — {project.name}</button>)}
          </div>}
        </div>
        <div className="rejection-filter-wrap">
          <button onClick={() => setStatusMenuOpen((open) => !open)}>Status: {statusFilter === 'all' ? 'All' : statusFilter === 'waiting_for_contact' ? 'Waiting for Contact' : 'Rejection Handled'} <ChevronDown size={16} /></button>
          {statusMenuOpen && <div className="rejection-filter-menu">
            <button className={statusFilter === 'all' ? 'active' : ''} onClick={() => { setStatusFilter('all'); setStatusMenuOpen(false) }}>Status: All</button>
            <button className={statusFilter === 'waiting_for_contact' ? 'active' : ''} onClick={() => { setStatusFilter('waiting_for_contact'); setStatusMenuOpen(false) }}>Waiting for Contact</button>
            <button className={statusFilter === 'handled' ? 'active' : ''} onClick={() => { setStatusFilter('handled'); setStatusMenuOpen(false) }}>Rejection Handled</button>
          </div>}
        </div>
      </div>

      <section className="rejection-table">
        <div className="rejection-row rejection-header">
          <span>Candidate Name</span><span>Project Name</span><span>Status</span><span>Eligible Date</span><span>Actions</span>
        </div>
        {rejectionRows.map(({ candidate, status }) => (
          <div className="rejection-row" key={candidate.id}>
            <div className="candidate-cell"><span className={`avatar avatar-${candidate.name[0].toLowerCase()}`}>{candidate.name[0]}</span><strong>{candidate.name.replace('.', '')}</strong></div>
            <span className="project-name-cell">{projects.find((project) => project.id === candidate.projectId)?.name ?? 'Project'}</span>
            <span className={`status-dot ${status === 'waiting_for_contact' ? 'status-dot--waiting_for_contact' : 'status-dot--withdrawn'}`}><i />{status === 'waiting_for_contact' ? 'Waiting for Contact' : 'Rejection Handled'}</span>
            <span>22.04.2026</span>
            <Link className="outline-button" to={`/projects/${candidate.projectId}/candidates/${candidate.id}?source=rejection`}>View</Link>
          </div>
        ))}
        <footer className="figma-table-footer rejection-footer"><span>Showing {rejectionRows.length} of {candidates.length} candidates</span></footer>
      </section>
    </div>
  )
}
