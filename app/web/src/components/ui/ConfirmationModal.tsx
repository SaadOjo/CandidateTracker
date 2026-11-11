import { Link } from 'react-router-dom'
import { RouteModal } from './RouteModal'

interface ConfirmationModalProps {
  title: string
  body: string
  closeTo: string
  confirmTone: 'primary' | 'danger'
  onConfirm: () => void | Promise<void>
}

export function ConfirmationModal({ title, body, closeTo, confirmTone, onConfirm }: ConfirmationModalProps) {
  return (
    <RouteModal closeTo={closeTo} showCloseButton>
      <section className="w-[420px] bg-white p-7">
        <h3 className="mt-0 mb-3 text-xl font-extrabold text-ink">{title}</h3>
        <p className="mt-0 mb-6 text-sm leading-5 text-body">{body}</p>
        <div className="flex justify-end gap-3">
          <Link className="inline-flex h-9 min-w-[88px] items-center justify-center rounded border button button-secondary text-xs font-bold no-underline" to={closeTo}>Cancel</Link>
          <button className={`inline-flex h-9 min-w-[88px] items-center justify-center rounded border-0 button ${confirmTone === 'danger' ? 'button-danger' : 'button-primary'} text-xs font-bold`} type="button" onClick={() => void onConfirm()}>Confirm</button>
        </div>
      </section>
    </RouteModal>
  )
}
