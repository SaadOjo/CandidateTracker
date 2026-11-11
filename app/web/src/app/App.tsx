import { DevAccountSwitcher } from '../auth/DevAccountSwitcher'
import { getAuthMode } from '../auth/auth'
import { useAuth } from '../auth/useAuth'
import { AppRoutes } from './AppRoutes'
import { AppLayout, shellClasses } from './layout/AppLayout'

const centeredPanelClasses = 'rounded-lg border border-border bg-white p-[26px]'
const eyebrowClasses = 'm-0 text-[11px] font-extrabold tracking-[0.08em] text-muted uppercase'

export function App() {
  const { state } = useAuth()
  const authMode = getAuthMode()

  if (state.status === 'loading' || state.status === 'switching') {
    return (
      <div className={`${shellClasses} place-items-center p-6`}>
        <section className={centeredPanelClasses}>
          <p className={eyebrowClasses}>Candidate Tracker</p>
          <h1>{state.status === 'switching' ? 'Switching account' : 'Loading account'}</h1>
        </section>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className={`${shellClasses} place-items-center p-6`}>
        <section className={centeredPanelClasses}>
          <p className={eyebrowClasses}>Authentication</p>
          <h1>Unable to load current user</h1>
          <p className="m-0 flex items-center gap-2 font-bold text-danger">{state.message}</p>
        </section>
      </div>
    )
  }

  if (state.status === 'unauthenticated') {
    if (authMode !== 'development') {
      throw new Error('Production login controls are not implemented')
    }

    return (
      <div className={`${shellClasses} place-items-center p-6`}>
        <section className={`${centeredPanelClasses} grid gap-4`}>
          <p className={eyebrowClasses}>Authentication</p>
          <h1 className="m-0">Select a development account</h1>
          <DevAccountSwitcher />
        </section>
      </div>
    )
  }

  return (
    <AppLayout session={state.session}>
      <AppRoutes key={state.session.userId} session={state.session} />
    </AppLayout>
  )
}
