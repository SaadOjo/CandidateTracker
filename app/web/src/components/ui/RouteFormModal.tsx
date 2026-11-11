import { Check, LoaderCircle, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { RouteModal } from './RouteModal'

interface RouteFormModalProps {
  title: string
  subtitle?: string
  closeTo: string
  submitLabel: string
  submitting?: boolean
  iconActions?: boolean
  onSubmit: () => void | Promise<void>
  children: ReactNode
}

export function RouteFormModal({ title, subtitle, closeTo, submitLabel, submitting = false, iconActions = false, onSubmit, children }: RouteFormModalProps) {
  return (
    <RouteModal closeTo={closeTo} showCloseButton>
      <section className="w-[576px] bg-white px-8 pt-[34px] max-[760px]:w-[min(100vw-32px,576px)]">
        <h1 className="mt-0 mb-5 text-4xl leading-10 font-extrabold text-ink">{title}</h1>
        {subtitle && <p className="mt-0 mb-[29px] text-sm leading-5 text-body">{subtitle}</p>}
        {children}
        {iconActions ? (
          <footer className="mt-6 -mx-8 flex items-center justify-end gap-2 bg-surface-subtle px-8 py-4" aria-busy={submitting}>
            <Link className="inline-flex h-8 w-8 items-center justify-center rounded-full border button button-text" to={closeTo} aria-label="Cancel log" title="Cancel">
              <X size={16} aria-hidden="true" />
            </Link>
            <button className="inline-flex h-8 w-8 items-center justify-center rounded-full border button button-primary" disabled={submitting} type="button" aria-label={submitting ? 'Saving log' : submitLabel} title={submitting ? 'Saving log' : submitLabel} onClick={() => void onSubmit()}>
              {submitting ? <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
            </button>
          </footer>
        ) : (
        <footer className="mt-[31px] -mr-8 -ml-8 flex h-[87px] items-start justify-between bg-surface-subtle px-8 pt-6">
          <Link className="ml-6 grid h-10 min-w-24 place-items-center button button-secondary rounded border text-sm font-bold no-underline" to={closeTo}>Cancel</Link>
          <button className="grid h-[41px] w-[185px] place-items-center rounded border-0 button button-primary text-sm font-bold" disabled={submitting} type="button" onClick={() => void onSubmit()}>
            {submitting ? 'Saving...' : submitLabel}
          </button>
        </footer>
        )}
      </section>
    </RouteModal>
  )
}
