import { BriefcaseBusiness, ChevronRight, UsersRound } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { stageLabels } from '../../domain/labels'
import type { PipelineStage } from '../../domain/types'

function Breadcrumbs() {
  const { pathname } = useLocation()
  const parts = pathname.split('/').filter(Boolean)

  if (pathname === '/projects' || pathname === '/projects/new' || (parts[0] === 'projects' && parts[2] === 'edit')) {
    return <span className="crumb active">Projects</span>
  }

  if (pathname === '/rejection-follow-up') {
    return <span className="crumb active">Rejection Follow-up</span>
  }

  if (parts[0] === 'projects' && parts[2] === 'pipeline') {
    const stage = parts[3] as PipelineStage
    return (
      <>
        <Link className="crumb" to="/projects">Projects</Link>
        <ChevronRight size={14} />
        <span className="crumb active">Senior Product Designer Hiring</span>
        {stage && stage !== 'department_interview' && <><ChevronRight size={14} /><span className="crumb muted">{stageLabels[stage]}</span></>}
      </>
    )
  }

  if (parts[0] === 'projects' && parts[2] === 'candidates') {
    return (
      <>
        <Link className="crumb" to="/projects">Projects</Link>
        <ChevronRight size={14} />
        <Link className="crumb" to="/projects/p-designer/pipeline/department_interview">Senior Product Designer Hiring</Link>
        <ChevronRight size={14} />
        <span className="crumb">1. Department Interview</span>
        <ChevronRight size={14} />
        <span className="crumb active">Li A.</span>
      </>
    )
  }

  return <span className="crumb active">Candidate Tracker</span>
}

export function AppLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/projects">
          <strong>Candidate Tracker</strong>
          <span>Recruitment Suite</span>
        </Link>

        <nav className="sidebar-nav">
          <NavLink to="/rejection-follow-up">
            <UsersRound size={20} strokeWidth={1.7} />
            <span>Rejection Follow-up</span>
          </NavLink>
        </nav>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumbs"><Breadcrumbs /></div>
          <div className="tool-icon"><BriefcaseBusiness size={18} /></div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
