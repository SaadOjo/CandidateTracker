import { BriefcaseBusiness, ChevronDown, ChevronRight, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { candidateTrackerRepository } from '../../data/repository'
import { stageLabels } from '../../domain/labels'
import type { Candidate, PipelineStage, Project, Role } from '../../domain/types'

function Breadcrumbs() {
  const { pathname, search } = useLocation()
  const parts = pathname.split('/').filter(Boolean)
  const projectId = parts[1]
  const candidateId = parts[3]
  const stage = parts[3] as PipelineStage | undefined
  const [project, setProject] = useState<Project>()
  const [candidate, setCandidate] = useState<Candidate>()

  useEffect(() => {
    if (projectId) {
      candidateTrackerRepository.getProject(projectId).then(setProject)
    } else {
      setProject(undefined)
    }
  }, [projectId])

  useEffect(() => {
    if (parts[0] === 'projects' && parts[2] === 'candidates' && candidateId) {
      candidateTrackerRepository.getCandidate(candidateId).then(setCandidate)
    } else {
      setCandidate(undefined)
    }
  }, [candidateId, parts])

  if (pathname === '/projects' || pathname === '/projects/new' || (parts[0] === 'projects' && parts[2] === 'edit')) {
    return <span className="crumb active">Projects</span>
  }

  if (pathname === '/projects/archived') {
    return (
      <>
        <Link className="crumb" to="/projects">Projects</Link>
        <ChevronRight size={14} />
        <span className="crumb active">Archived Projects</span>
      </>
    )
  }

  if (pathname === '/rejection-follow-up') {
    return <span className="crumb active">Rejection Follow-up</span>
  }

  if (parts[0] === 'projects' && parts[2] === 'pipeline') {
    return (
      <>
        <Link className="crumb" to="/projects">Projects</Link>
        <ChevronRight size={14} />
        <span className="crumb active">{project?.name ?? 'Project'}</span>
        {stage && stage !== 'department_interview' && <><ChevronRight size={14} /><span className="crumb muted">{stageLabels[stage]}</span></>}
      </>
    )
  }

  if (parts[0] === 'projects' && parts[2] === 'candidates') {
    const candidateStage = candidate?.stage ?? 'department_interview'
    const source = new URLSearchParams(search).get('source')

    if (source === 'rejection') {
      return (
        <>
          <Link className="crumb" to="/rejection-follow-up">Rejection Follow-up</Link>
          <ChevronRight size={14} />
          <span className="crumb active">{candidate?.name ?? 'Candidate'}</span>
        </>
      )
    }

    return (
      <>
        <Link className="crumb" to="/projects">Projects</Link>
        <ChevronRight size={14} />
        <Link className="crumb" to={`/projects/${projectId}/pipeline/${candidateStage}`}>{project?.name ?? 'Project'}</Link>
        <ChevronRight size={14} />
        <Link className="crumb" to={`/projects/${projectId}/pipeline/${candidateStage}`}>{stageLabels[candidateStage]}</Link>
        <ChevronRight size={14} />
        <span className="crumb active">{candidate?.name ?? 'Candidate'}</span>
      </>
    )
  }

  return <span className="crumb active">Candidate Tracker</span>
}

const profiles: Record<Role, { name: string; label: string }> = {
  hr: { name: 'Sarah Chen', label: 'HR Manager' },
  hm: { name: 'Maya Patel', label: 'Hiring Manager' },
}

export interface AppOutletContext {
  role: Role
}

export function AppLayout() {
  const [role, setRole] = useState<Role>(() => {
    if (typeof window === 'undefined') return 'hr'
    const saved = window.localStorage.getItem('candidate-tracker-role')
    return saved === 'hm' ? 'hm' : 'hr'
  })
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  useEffect(() => {
    window.localStorage.setItem('candidate-tracker-role', role)
  }, [role])

  const activeProfile = profiles[role]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/projects">
          <strong>Candidate Tracker</strong>
          <span>Recruitment Suite</span>
        </Link>

        <nav className="sidebar-nav">
          {role === 'hr' && <NavLink to="/rejection-follow-up">
            <UsersRound size={20} strokeWidth={1.7} />
            <span>Rejection Follow-up</span>
          </NavLink>}
        </nav>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumbs"><Breadcrumbs /></div>
          <div className="profile-menu-wrap">
            <button className="profile-button-trigger" onClick={() => setProfileMenuOpen((open) => !open)}>
              <span className="tool-icon"><BriefcaseBusiness size={18} /></span>
              <span className="profile-copy">
                <strong>{activeProfile.label}</strong>
                <small>{activeProfile.name}</small>
              </span>
              <ChevronDown size={16} />
            </button>
            {profileMenuOpen && (
              <div className="profile-menu">
                <button className={role === 'hr' ? 'active' : ''} onClick={() => { setRole('hr'); setProfileMenuOpen(false) }}>
                  <strong>HR Manager</strong>
                  <small>Sarah Chen</small>
                </button>
                <button className={role === 'hm' ? 'active' : ''} onClick={() => { setRole('hm'); setProfileMenuOpen(false) }}>
                  <strong>Hiring Manager</strong>
                  <small>Maya Patel</small>
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="main-content">
          <Outlet context={{ role }} />
        </main>
      </div>
    </div>
  )
}
