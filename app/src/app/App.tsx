import { Briefcase, ChevronRight, FolderKanban, UserRound } from 'lucide-react'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { appRoleLabels, stageLabels, userRoleLabels } from '../domain/labels'
import { getCandidate, getCurrentSession, getProject, listUsers, setDevAuthUserId } from '../data/api'
import type { AuthSession, Candidate, Project, User } from '../domain/types'
import { CandidateDetailPage } from '../pages/candidate-detail/CandidateDetailPage'
import { ProjectPipelinePage } from '../pages/project-pipeline/ProjectPipelinePage'
import { ProjectsPage } from '../pages/projects/ProjectsPage'
import { RejectionFollowUpPage } from '../pages/rejection-follow-up/RejectionFollowUpPage'
import './App.css'
import { useEffect, useState } from 'react'

export function App() {
  const location = useLocation()
  const [session, setSession] = useState<AuthSession | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadSession() {
      try {
        const devUserId = new URLSearchParams(location.search).get('devUserId')
        if (devUserId) setDevAuthUserId(devUserId)
        const currentSession = await getCurrentSession()
        if (active) setSession(currentSession)
      } catch (error) {
        if (active) setSessionError(error instanceof Error ? error.message : 'Could not load current user')
      }
    }

    void loadSession()

    return () => {
      active = false
    }
  }, [location.search])

  if (sessionError) {
    return (
      <div className="app-shell app-shell--centered">
        <section className="surface-panel">
          <p className="eyebrow">Authentication</p>
          <h1>Unable to load current user</h1>
          <p className="request-error">{sessionError}</p>
        </section>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="app-shell app-shell--centered">
        <section className="surface-panel">
          <p className="eyebrow">Candidate Tracker</p>
          <h1>Loading account</h1>
        </section>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <span className="brand">
          <strong>Candidate Tracker</strong>
          <span>Recruitment Suite</span>
        </span>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <NavLink to="/projects">
            <FolderKanban size={18} />
            Projects
          </NavLink>
          {(session.appRole === 'admin' || session.appRole === 'hr') && (
            <NavLink to="/rejection-follow-up">
              <Briefcase size={18} />
              Rejection Follow-up
            </NavLink>
          )}
        </nav>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <Breadcrumbs pathname={location.pathname} />
          <div className="topbar-account-group">
            <div className="account-chip" aria-label="Current account">
              <span className="tool-icon">
                <UserRound size={17} />
              </span>
              <span className="account-copy">
                <strong>{userRoleLabels[session.role] ?? appRoleLabels[session.appRole]}</strong>
                <small>{session.name}</small>
              </span>
            </div>
            <DevAccountSwitcher currentUserId={session.userId} onChanged={setSession} />
          </div>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<ProjectsPage session={session} />} />
            <Route path="/projects/archived" element={<ProjectsPage session={session} view="archived" />} />
            <Route path="/projects/new" element={<ProjectsPage session={session} modal="new" />} />
            <Route path="/projects/:projectId/edit" element={<ProjectsPage session={session} modal="edit" />} />
            <Route path="/projects/:projectId/pipeline/:stage" element={<ProjectPipelinePage session={session} />} />
            <Route
              path="/projects/:projectId/candidates/:candidateId"
              element={<CandidateDetailPage session={session} />}
            />
            <Route path="/rejection-follow-up" element={<RejectionFollowUpPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function DevAccountSwitcher({
  currentUserId,
  onChanged,
}: {
  currentUserId: string
  onChanged: (session: AuthSession) => void
}) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true

    async function loadUsers() {
      try {
        const items = await listUsers()
        if (active) setUsers(items)
      } catch {
        if (active) setUsers([])
      }
    }

    void loadUsers()

    return () => {
      active = false
    }
  }, [])

  async function switchAccount(userId: string) {
    setLoading(true)
    try {
      setDevAuthUserId(userId)
      onChanged(await getCurrentSession())
    } finally {
      setLoading(false)
    }
  }

  if (users.length === 0) return null

  return (
    <label className="dev-account-switcher">
      <span>Dev account</span>
      <select
        disabled={loading}
        value={currentUserId}
        onChange={(event) => void switchAccount(event.target.value)}
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} · {userRoleLabels[user.role]}
          </option>
        ))}
      </select>
    </label>
  )
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  const [project, setProject] = useState<Project | null>(null)
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const projectId = pathname.match(/\/projects\/([^/]+)/)?.[1]
  const candidateId = pathname.match(/\/candidates\/([^/?]+)/)?.[1]
  const stage = pathname.match(/\/pipeline\/([^/?]+)/)?.[1]
  const isRejection = pathname.startsWith('/rejection-follow-up')
  const isPipeline = pathname.includes('/pipeline/')

  useEffect(() => {
    let active = true

    async function loadCrumbs() {
      setProject(null)
      setCandidate(null)
      if (!projectId || projectId === 'new' || projectId === 'archived') return

      try {
        const [projectItem, candidateItem] = await Promise.all([
          getProject(projectId),
          candidateId ? getCandidate(candidateId) : Promise.resolve(null),
        ])
        if (!active) return
        setProject(projectItem)
        setCandidate(candidateItem)
      } catch {
        if (!active) return
        setProject(null)
        setCandidate(null)
      }
    }

    void loadCrumbs()

    return () => {
      active = false
    }
  }, [candidateId, projectId])

  return (
    <div className="breadcrumbs" aria-label="Breadcrumb">
      {isRejection ? (
        <span className="crumb active">Rejection Follow-Up</span>
      ) : (
        <>
          <Link className="crumb muted" to="/projects">Projects</Link>
          {project && (
            <>
              <ChevronRight size={16} />
              {isPipeline ? (
                <span className="crumb active">{project.name}</span>
              ) : (
                <Link className="crumb muted" to={`/projects/${project.id}/pipeline/${candidate?.stage ?? 'pre_interview'}`}>
                  {project.name}
                </Link>
              )}
            </>
          )}
          {candidate && (
            <>
              <ChevronRight size={16} />
              <Link className="crumb muted" to={`/projects/${projectId}/pipeline/${candidate.stage}`}>
                {stageLabels[candidate.stage]}
              </Link>
              <ChevronRight size={16} />
              <span className="crumb active">{candidate.name}</span>
            </>
          )}
          {!project && !candidate && (
            <>
              <ChevronRight size={16} />
              <span className="crumb active">{stage && isPipeline ? 'Project Pipeline' : 'Projects'}</span>
            </>
          )}
        </>
      )}
    </div>
  )
}
