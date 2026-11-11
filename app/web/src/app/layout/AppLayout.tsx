import { Briefcase, FolderKanban, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { DevAccountSwitcher } from '../../auth/DevAccountSwitcher'
import { getAuthMode } from '../../auth/auth'
import type { AuthSession } from '../../auth/auth'
import { userRoleLabels } from '../../domain/labels'
import { Breadcrumbs } from '../navigation/Breadcrumbs'

export const shellClasses = 'grid min-h-screen grid-cols-[256px_minmax(0,1fr)] border border-shell-border bg-canvas max-[1100px]:grid-cols-1'
const sidebarLinkClasses = 'flex h-11 items-center gap-[13px] rounded border px-3.5 text-sm no-underline'

export function AppLayout({
  session,
  children,
}: {
  session: AuthSession
  children: ReactNode
}) {
  const location = useLocation()
  const roleLabel = userRoleLabels[session.role]
  if (!roleLabel) throw new Error(`Unsupported user role: ${session.role}`)

  return (
    <div className={shellClasses}>
      <aside className="bg-surface-subtle px-[13px] py-[34px] border-r border-shell-border max-[1100px]:hidden">
        <span className="mx-[18px] mt-0 mb-[33px] block">
          <strong className="block text-[21px] leading-[25px] text-heading">Candidate Tracker</strong>
        </span>
        {import.meta.env.VITE_CLOUDFLARE_DEMO === 'true' && (
          <p className="mx-3 mb-5 text-xs leading-5 text-muted">Public demo · fictional data only</p>
        )}
        <nav className="grid gap-2" aria-label="Main navigation">
          <NavLink
            className={({ isActive }) => `${sidebarLinkClasses} control-selectable ${isActive ? 'font-bold' : ''}`}
            to="/projects"
          >
            <FolderKanban size={18} />
            Projects
          </NavLink>
          {(session.appRole === 'admin' || session.appRole === 'human_resource') && (
            <NavLink
              className={({ isActive }) => `${sidebarLinkClasses} control-selectable ${isActive ? 'font-bold' : ''}`}
              to="/rejection-follow-up"
            >
              <Briefcase size={18} />
              Rejection Follow-up
            </NavLink>
          )}
        </nav>
      </aside>

      <div className="min-w-0 overflow-x-hidden">
        <header className="flex h-[63px] items-center justify-between border-b border-divider bg-surface-muted px-[33px] max-[760px]:h-auto max-[760px]:flex-col max-[760px]:items-start max-[760px]:gap-2.5 max-[760px]:px-[18px] max-[760px]:py-3.5">
          <Breadcrumbs currentUserId={session.userId} pathname={location.pathname} search={location.search} />
          <div className="flex min-w-0 items-center gap-3 max-[760px]:w-full max-[760px]:flex-wrap">
            <div className="flex min-h-[42px] items-center gap-2.5 rounded-xl border border-border bg-white py-0 pr-3 pl-1.5 text-left leading-[1.2]" aria-label="Current account">
              <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-tool bg-action-icon text-white">
                <UserRound size={17} />
              </span>
              <span className="grid leading-[1.15]">
                <strong className="text-[13px] text-ink">{roleLabel}</strong>
                <small className="text-[11px] font-bold text-muted">{session.name}</small>
              </span>
            </div>
            {getAuthMode() === 'development' && <DevAccountSwitcher />}
          </div>
        </header>

        <main className="m-0 w-full max-w-none overflow-x-hidden p-0">{children}</main>
      </div>
    </div>
  )
}
