import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { RouteModal } from './RouteModal'

interface RouteFormModalProps {
  title: string
  subtitle?: string
  closeTo: string
  submitLabel: string
  submitting?: boolean
  onSubmit: () => void | Promise<void>
  children: ReactNode
}

export function RouteFormModal({ title, subtitle, closeTo, submitLabel, submitting = false, onSubmit, children }: RouteFormModalProps) {
  return (
    <RouteModal closeTo={closeTo} showCloseButton>
      <section className="w-[576px] bg-white px-8 pt-[34px] max-[760px]:w-[min(100vw-32px,576px)]">
        <h1 className="mt-0 mb-5 text-4xl leading-10 font-extrabold text-ink">{title}</h1>
        {subtitle && <p className="mt-0 mb-[29px] text-sm leading-5 text-body">{subtitle}</p>}
        {children}
        <footer className="mt-[31px] -mr-8 -ml-8 flex h-[87px] items-start justify-between bg-surface-subtle px-8 pt-6">
          <Link className="ml-6 grid h-10 min-w-24 place-items-center text-sm font-bold text-muted" to={closeTo}>Cancel</Link>
          <button className="grid h-[41px] w-[185px] place-items-center rounded border-0 bg-action-secondary text-sm font-bold text-white" disabled={submitting} type="button" onClick={() => void onSubmit()}>
            {submitting ? 'Saving...' : submitLabel}
          </button>
        </footer>
      </section>
    </RouteModal>
  )
}
