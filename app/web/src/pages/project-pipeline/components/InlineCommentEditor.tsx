import { useState } from 'react'
import { Check, LoaderCircle, X } from 'lucide-react'
import { ErrorMessage } from '../../../components/feedback/ErrorMessage'

interface InlineCommentEditorProps {
  id: string
  label: string
  initialValue: string
  onSave: (body: string) => Promise<void>
  onClose: () => void
}

const actionClasses = 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border button'

export function InlineCommentEditor({ id, label, initialValue, onSave, onClose }: InlineCommentEditorProps) {
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await onSave(value.trim())
      onClose()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save comment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form id={id} className="mt-3 w-full" aria-busy={saving} onSubmit={(event) => { event.preventDefault(); void save() }}>
      {error && <ErrorMessage className="mb-3" message={error} />}
      <textarea
        className="block min-h-24 w-full resize-y rounded border border-border bg-surface-subtle px-3 py-2.5 text-sm leading-5 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus"
        aria-label={label}
        value={value}
        disabled={saving}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Type your comment here..."
      />
      <div className="mt-2 flex justify-end gap-2">
        <button className={`${actionClasses} button-text`} type="button" disabled={saving} onClick={onClose} aria-label="Cancel" title="Cancel">
          <X size={16} aria-hidden="true" />
        </button>
        <button className={`${actionClasses} button-primary`} type="submit" disabled={saving} aria-label={saving ? 'Saving comment' : 'Save comment'} title={saving ? 'Saving comment' : 'Save comment'}>
          {saving ? <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
        </button>
      </div>
    </form>
  )
}
