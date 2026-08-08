import { ChevronDown, NotebookPen } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { AuthSession, Candidate, CandidateNoteInput } from '../../../../domain/types'
import { buildNoteInput, hasNoteDraftContent, noteFieldsToForm } from '../../candidateDetailHelpers'
import { HrInterviewNoteForm } from './HrInterviewNoteForm'

interface CandidateNoteEditorProps {
  role: 'human_resource' | 'hiring_manager'
  session: AuthSession
  candidate: Candidate
  onSave: (input: CandidateNoteInput) => Promise<void>
  onError: (message: string | null) => void
}

const actionClasses = 'flex min-h-5 items-center gap-3 border-0 bg-transparent px-2.5 text-left text-sm font-bold text-ink no-underline'
const noteInputClasses = 'min-h-[92px] w-full rounded border-0 bg-white px-4 py-3.5 text-[13px] leading-5 text-muted outline-0'

export function CandidateNoteEditor({ role, session, candidate, onSave, onError }: CandidateNoteEditorProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [textNote, setTextNote] = useState('')
  const [formNote, setFormNote] = useState<Record<string, string>>({})
  const existingOwnNote = useMemo(
    () => candidate.notes.find((note) => note.author.id === session.userId),
    [candidate.notes, session.userId],
  )
  const hasContent = hasNoteDraftContent(role, candidate, textNote, formNote)

  function toggleEditor() {
    setOpen((current) => {
      if (!current) {
        onError(null)
        setTextNote(existingOwnNote?.body ?? '')
        setFormNote(existingOwnNote ? noteFieldsToForm(existingOwnNote) : {})
      }
      return !current
    })
  }

  async function saveNote() {
    const note = buildNoteInput(role, candidate, textNote, formNote)
    if (!note) return

    setSaving(true)
    onError(null)
    try {
      await onSave(note)
      setTextNote('')
      setFormNote({})
      setOpen(false)
    } catch (requestError) {
      onError(requestError instanceof Error ? requestError.message : 'Could not save note')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-3">
      <button className={actionClasses} type="button" onClick={toggleEditor}>
        <NotebookPen size={16} />
        {existingOwnNote ? 'Edit Note' : 'Add Note'}
        <ChevronDown className={`ml-auto transition-transform duration-180 ${open ? 'rotate-180' : ''}`} size={16} />
      </button>
      {open && (
        <div className="ml-2.5 grid gap-3 rounded-md border border-muted bg-white/45 p-3.5">
          {role === 'human_resource' && (candidate.stage === 'hr_interview' || candidate.stage === 'pre_interview') ? (
            <HrInterviewNoteForm values={formNote} onChange={setFormNote} />
          ) : (
            <textarea className={`${noteInputClasses} resize-y`} value={textNote} onChange={(event) => setTextNote(event.target.value)} placeholder="Type your note here..." />
          )}
          <div className="flex justify-end gap-3">
            <button
              className="flex h-7 min-w-[84px] items-center justify-center rounded bg-action-secondary text-xs text-white disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!hasContent || saving}
              type="button"
              onClick={() => void saveNote()}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button className="flex h-7 min-w-[84px] items-center justify-center rounded border border-subtle bg-surface-action text-xs text-ink" type="button" onClick={() => { setOpen(false); setTextNote(''); setFormNote({}) }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
