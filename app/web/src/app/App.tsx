import { Briefcase, ChevronRight, FolderKanban, UserRound } from 'lucide-react'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { appRoleLabels, stageLabels, userRoleLabels } from '../domain/labels'
import { getCandidate, getCurrentSession, getProject, listUsers, setDevAuthUserId } from '../data/api'
import type { AuthSession, Candidate, Project, User } from '../domain/types'
import { CandidateDetailPage } from '../pages/candidate-detail/CandidateDetailPage'
import { ProjectPipelinePage } from '../pages/project-pipeline/ProjectPipelinePage'
import { ProjectsPage } from '../pages/projects/ProjectsPage'
import { RejectionFollowUpPage } from '../pages/rejection-follow-up/RejectionFollowUpPage'
import { useEffect, useState } from 'react'

const shellClasses = 'grid min-h-screen grid-cols-[256px_minmax(0,1fr)] border border-shell-border bg-canvas max-[1100px]:grid-cols-1'
const centeredPanelClasses = 'rounded-lg border border-border bg-white p-[26px]'
const eyebrowClasses = 'm-0 text-[11px] font-extrabold tracking-[0.08em] text-muted uppercase'
const crumbClasses = 'pt-[3px] leading-7'
const mutedCrumbClasses = `${crumbClasses} text-muted no-underline`
const activeCrumbClasses = `${crumbClasses} border-b-2 border-heading font-bold text-heading`
const sidebarLinkClasses = 'flex h-11 items-center gap-[13px] rounded border px-3.5 text-sm no-underline'

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
      <div className={`${shellClasses} place-items-center p-6`}>
        <section className={centeredPanelClasses}>
          <p className={eyebrowClasses}>Authentication</p>
          <h1>Unable to load current user</h1>
          <p className="m-0 flex items-center gap-2 font-bold text-danger">{sessionError}</p>
        </section>
      </div>
    )
  }

  if (!session) {
    return (
      <div className={`${shellClasses} place-items-center p-6`}>
        <section className={centeredPanelClasses}>
          <p className={eyebrowClasses}>Candidate Tracker</p>
          <h1>Loading account</h1>
        </section>
      </div>
    )
  }

  return (
    <div className={shellClasses}>
      <aside className="bg-surface-subtle px-[13px] py-[34px] border-r border-shell-border max-[1100px]:hidden">
        <span className="mx-[18px] mt-0 mb-[33px] block">
          <strong className="block text-[21px] leading-[25px] text-heading">Candidate Tracker</strong>
          <span className="mt-[3px] block text-[13px] text-subtle">Recruitment Suite</span>
        </span>
        <nav className="grid gap-2" aria-label="Main navigation">
          <NavLink
            className={({ isActive }) => `${sidebarLinkClasses} ${isActive ? 'border-nav-active bg-nav-active text-white' : 'border-shell-border text-body'}`}
            to="/projects"
          >
            <FolderKanban size={18} />
            Projects
          </NavLink>
          {(session.appRole === 'admin' || session.appRole === 'human_resource') && (
            <NavLink
              className={({ isActive }) => `${sidebarLinkClasses} ${isActive ? 'border-nav-active bg-nav-active text-white' : 'border-shell-border text-body'}`}
              to="/rejection-follow-up"
            >
              <Briefcase size={18} />
              Rejection Follow-up
            </NavLink>
          )}
        </nav>
      </aside>

      <div className="min-w-0 overflow-x-hidden">
        <header className="flex h-[63px] items-center justify-between border-b border-border-strong bg-white px-[33px] max-[760px]:h-auto max-[760px]:flex-col max-[760px]:items-start max-[760px]:gap-2.5 max-[760px]:px-[18px] max-[760px]:py-3.5">
          <Breadcrumbs pathname={location.pathname} search={location.search} />
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex min-h-[42px] items-center gap-2.5 rounded-xl border border-border bg-white py-0 pr-3 pl-1.5 text-left leading-[1.2]" aria-label="Current account">
              <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-tool bg-action-icon text-white">
                <UserRound size={17} />
              </span>
              <span className="grid leading-[1.15]">
                <strong className="text-[13px] text-ink">{userRoleLabels[session.role] ?? appRoleLabels[session.appRole]}</strong>
                <small className="text-[11px] font-bold text-muted">{session.name}</small>
              </span>
            </div>
            <DevAccountSwitcher currentUserId={session.userId} onChanged={setSession} />
          </div>
        </header>

        <main className="m-0 w-full max-w-none overflow-x-hidden p-0">
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
            <Route
              path="/rejection-follow-up"
              element={session.appRole === 'hiring_manager' ? <Navigate to="/projects" replace /> : <RejectionFollowUpPage />}
            />
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
    <label className="flex items-center gap-2">
      <span className="text-[11px] font-extrabold text-muted uppercase">Dev account</span>
      <select
        className="h-[34px] max-w-[230px] rounded-lg border border-border bg-surface-subtle px-2.5 text-xs font-bold text-ink outline-0"
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

function Breadcrumbs({ pathname, search }: { pathname: string; search: string }) {
  const [project, setProject] = useState<Project | null>(null)
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const projectId = pathname.match(/\/projects\/([^/]+)/)?.[1]
  const candidateId = pathname.match(/\/candidates\/([^/?]+)/)?.[1]
  const stage = pathname.match(/\/pipeline\/([^/?]+)/)?.[1]
  const isRejection = pathname.startsWith('/rejection-follow-up')
  const isRejectionSource = new URLSearchParams(search).get('source') === 'rejection'
  const isPipeline = pathname.includes('/pipeline/')

  useEffect(() => {
    function refreshCrumbs() {
      setRefreshKey((value) => value + 1)
    }

    window.addEventListener('candidate-tracker:candidate-changed', refreshCrumbs)
    return () => window.removeEventListener('candidate-tracker:candidate-changed', refreshCrumbs)
  }, [])

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
  }, [candidateId, projectId, refreshKey])

  return (
    <div className="flex items-center gap-3 text-base text-muted" aria-label="Breadcrumb">
      {isRejection ? (
        <span className={activeCrumbClasses}>Rejection Follow-Up</span>
      ) : isRejectionSource ? (
        <>
          <Link className={mutedCrumbClasses} to="/rejection-follow-up">Rejection Follow-Up</Link>
          <ChevronRight size={16} />
          <span className={activeCrumbClasses}>{candidate?.name ?? 'Candidate'}</span>
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
                <Link className={mutedCrumbClasses} to={`/projects/${project.id}/pipeline/${candidate?.stage ?? 'pre_interview'}`}>
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
              <span className={activeCrumbClasses}>{stage && isPipeline ? 'Project Pipeline' : 'Projects'}</span>
            </>
          )}
        </>
      )}
    </div>
  )
}
