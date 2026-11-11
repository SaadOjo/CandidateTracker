import { Check, ChevronDown, LoaderCircle, NotebookPen, X } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import type { AuthSession } from '../../../../auth/auth'
import { ErrorMessage } from '../../../../components/feedback/ErrorMessage'
import type { Candidate, CandidateNoteInput } from '../../../../domain/types'
import { buildNoteInput, hasNoteDraftContent, noteFieldsToForm, usesStructuredNote } from '../../candidateDetailHelpers'
import { HrInterviewNoteForm } from './HrInterviewNoteForm'

interface CandidateNoteEditorProps {
  role: 'human_resource' | 'hiring_manager'
  session: AuthSession
  candidate: Candidate
  onSave: (input: CandidateNoteInput) => Promise<void>
  embedded?: boolean
  onClose?: () => void
}

const actionClasses = 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border button'
const noteInputClasses = 'min-h-28 w-full rounded border border-border bg-surface-subtle px-3 py-2.5 text-sm leading-5 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus'

export function CandidateNoteEditor({ role, session, candidate, onSave, embedded = false, onClose }: CandidateNoteEditorProps) {
  const editorId = useId()
  const [open, setOpen] = useState(embedded)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const existingOwnNote = useMemo(
    () => candidate.notes.find((note) => note.author.id === session.userId),
    [candidate.notes, session.userId],
  )
  const [textNote, setTextNote] = useState(existingOwnNote?.body ?? '')
  const [formNote, setFormNote] = useState<Record<string, string>>(() => existingOwnNote ? noteFieldsToForm(existingOwnNote) : {})
  const hasContent = hasNoteDraftContent(role, candidate, textNote, formNote, existingOwnNote)

  function toggleEditor() {
    setOpen((current) => {
      if (!current) {
        setError(null)
        setTextNote(existingOwnNote?.body ?? '')
        setFormNote(existingOwnNote ? noteFieldsToForm(existingOwnNote) : {})
      }
      return !current
    })
  }

  async function saveNote() {
    const note = buildNoteInput(role, candidate, textNote, formNote, existingOwnNote)
    if (!note) return

    setSaving(true)
    setError(null)
    try {
      await onSave(note)
      setTextNote('')
      setFormNote({})
      setOpen(false)
      onClose?.()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save note')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={embedded ? 'min-w-0' : 'min-w-0 rounded-lg border border-border bg-white'} aria-label="Candidate note editor">
      {!embedded && <button className="flex min-h-14 w-full items-center gap-3 rounded-lg border-0 button button-text px-6 py-4 text-left text-sm font-bold" type="button" aria-expanded={open} aria-controls={open ? editorId : undefined} disabled={saving} onClick={toggleEditor}>
        <NotebookPen size={16} />
        {existingOwnNote ? 'Edit Note' : 'Add Note'}
        <ChevronDown className={`ml-auto transition-transform duration-180 ${open ? 'rotate-180' : ''}`} size={16} />
      </button>}
      {open && (
        <form id={editorId} className={embedded ? 'grid gap-4 pt-4' : 'grid gap-4 px-6 pt-3 pb-5'} aria-busy={saving} onSubmit={(event) => { event.preventDefault(); void saveNote() }}>
          {error && <ErrorMessage message={error} />}
          <fieldset className="m-0 min-w-0 border-0 p-0" disabled={saving}>
          {usesStructuredNote(role, candidate, existingOwnNote) ? (
            <HrInterviewNoteForm values={formNote} onChange={setFormNote} />
          ) : (
            <textarea className={`${noteInputClasses} block resize-y`} aria-label="Candidate note" value={textNote} onChange={(event) => setTextNote(event.target.value)} placeholder="Type your note here..." />
          )}
          </fieldset>
          <div className="flex justify-end gap-2">
            <button className={`${actionClasses} button-text`} type="button" disabled={saving} aria-label="Cancel note" title="Cancel" onClick={() => { setOpen(false); setTextNote(''); setFormNote({}); setError(null); onClose?.() }}>
              <X size={16} aria-hidden="true" />
            </button>
            <button
              className={`${actionClasses} button-primary`}
              disabled={!hasContent || saving}
              type="submit"
              aria-label={saving ? 'Saving note' : 'Save note'}
              title={saving ? 'Saving note' : 'Save note'}
            >
              {saving ? <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
