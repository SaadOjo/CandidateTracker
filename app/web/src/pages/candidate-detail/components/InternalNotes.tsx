import { ChevronDown, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Candidate, CandidateNoteInput } from '../../../domain/types'
import type { AuthSession } from '../../../auth/auth'
import { CandidateNoteEditor } from './candidate-notes/CandidateNoteEditor'
import { formatDateTime, formatNoteAuthor, groupNotesByRole } from '../candidateDetailHelpers'

interface InternalNotesProps {
  candidate: Candidate
  session: AuthSession
  onSave: (input: CandidateNoteInput) => Promise<void>
  role: 'human_resource' | 'hiring_manager'
}

export function InternalNotes({ candidate, session, onSave, role }: InternalNotesProps) {
  const notes = candidate.notes
  const visibleNotes = useMemo(
    () => notes.filter((note) => {
      const visibility = requireVisibility(note.visibility, `candidate note ${note.id}`)
      return role === 'human_resource' || visibility === 'all'
    }),
    [notes, role],
  )
  const groupedNotes = useMemo(() => groupNotesByRole(visibleNotes), [visibleNotes])
  const [collapsedNotes, setCollapsedNotes] = useState<Record<string, boolean>>({})
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)

  if (visibleNotes.length === 0) return null

  return (
    <section className="min-w-0 rounded-lg border border-border bg-white p-6 max-[760px]:p-4">
      <h2 className="mt-0 mb-5 text-xs font-extrabold tracking-[0.12em] text-muted uppercase">Internal Notes</h2>
      <div className="grid gap-6">
        {groupedNotes.map((group) => (
          <section className="grid gap-3" key={group.role}>
            <h3 className="m-0 text-[11px] font-extrabold tracking-[0.12em] text-muted uppercase">{group.label}</h3>
            {group.notes.map((note) => {
              const visibleFields = (note.fields ?? []).filter((field) => {
                const visibility = requireVisibility(field.visibility, `field ${field.question} in candidate note ${note.id}`)
                return role === 'human_resource' || visibility === 'all'
              })
              const collapsed = collapsedNotes[note.id] ?? true
              const editing = editingNoteId === note.id
              return (
                <article className={`rounded-panel bg-surface-muted px-6 ${collapsed ? 'py-3.5' : 'py-[22px]'}`} key={note.id}>
                  <div className={`flex flex-wrap items-center justify-between gap-4 ${collapsed ? 'mb-0' : 'mb-3.5'}`}>
                    <span className="w-fit bg-white px-2 py-1 text-[11px] font-extrabold text-muted uppercase">{formatNoteAuthor(note)}</span>
                    <div className="inline-flex items-center gap-2.5">
                      <time className="text-xs text-faint">{formatDateTime(note.updatedAt)}</time>
                      {note.author.id === session.userId && !editing && (
                        <button className="inline-flex h-7 w-7 items-center justify-center rounded-full border button button-secondary" type="button" aria-label="Edit your note" title="Edit note" onClick={() => setEditingNoteId(note.id)}>
                          <Pencil size={14} aria-hidden="true" />
                        </button>
                      )}
                      {!editing && <button
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border button button-secondary"
                        type="button"
                        aria-label={collapsed ? 'Expand note' : 'Collapse note'}
                        aria-expanded={!collapsed}
                        onClick={() => setCollapsedNotes((current) => ({ ...current, [note.id]: !collapsed }))}
                      >
                        <ChevronDown className={`transition-transform ${collapsed ? '' : 'rotate-180'}`} size={16} />
                      </button>}
                    </div>
                  </div>
                  {editing ? (
                    <CandidateNoteEditor embedded candidate={candidate} role={role} session={session} onSave={onSave} onClose={() => { setEditingNoteId(null); setCollapsedNotes((current) => ({ ...current, [note.id]: false })) }} />
                  ) : !collapsed && (
                    visibleFields.length > 0 ? (
                      <div className="grid gap-3.5">
                        {visibleFields.map((field) => (
                          <div className="grid gap-1.5" key={`${note.id}-${field.question}`}>
                            <strong className="text-xs text-body">{field.question}</strong>
                            <p className="m-0 text-sm leading-[21px] text-body">{field.answer}</p>
                          </div>
                        ))}
                      </div>
                    ) : note.body ? (
                      <p className="m-0 text-sm leading-[21px] text-body">{note.body}</p>
                    ) : null
                  )}
                </article>
              )
            })}
          </section>
        ))}
      </div>
    </section>
  )
}

function requireVisibility(value: unknown, context: string): 'all' | 'human_resource_only' {
  if (value === 'all' || value === 'human_resource_only') return value
  throw new Error(`Invalid visibility for ${context}: ${String(value)}`)
}
