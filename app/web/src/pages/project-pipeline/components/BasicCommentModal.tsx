import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ErrorMessage } from '../../../components/feedback/ErrorMessage'
import { RouteModal } from '../../../components/ui/RouteModal'

interface BasicCommentModalProps {
  title: string
  closeTo: string
  initialValue: string
  onSave: (body: string) => Promise<void>
}

const actionClasses = 'inline-flex h-9 min-w-[88px] items-center justify-center rounded border button text-xs font-bold no-underline'

export function BasicCommentModal({ title, closeTo, initialValue, onSave }: BasicCommentModalProps) {
  const navigate = useNavigate()
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await onSave(value.trim())
      navigate(closeTo)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save comment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <RouteModal closeTo={closeTo} className="w-[520px]">
      <section className="bg-white p-7">
        <h1 className="mt-0 mb-[18px] font-display text-[28px] leading-[34px] font-extrabold text-ink">{title}</h1>
        {error && <ErrorMessage message={error} />}
        <textarea className="min-h-[180px] w-full resize-y rounded border-0 bg-surface-muted px-4 py-3.5 text-sm leading-5 text-muted outline-0" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Type your comment here..." />
        <div className="mt-[18px] flex justify-end gap-3">
          <Link className={`${actionClasses} button-secondary`} to={closeTo}>Cancel</Link>
          <button className={`${actionClasses} button-primary`} disabled={saving} type="button" onClick={() => void save()}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </section>
    </RouteModal>
  )
}
