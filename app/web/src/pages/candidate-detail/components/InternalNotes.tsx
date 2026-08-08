import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { CandidateNote, Project } from '../../../domain/types'
import { formatDateTime, formatNoteAuthor, groupNotesByRole } from '../candidateDetailHelpers'

interface InternalNotesProps {
  notes: CandidateNote[]
  role: 'human_resource' | 'hiring_manager'
  project: Project | null
}

export function InternalNotes({ notes, role, project }: InternalNotesProps) {
  const visibleNotes = useMemo(
    () => notes.filter((note) => role === 'human_resource' || note.visibility !== 'human_resource_only'),
    [notes, role],
  )
  const groupedNotes = useMemo(() => groupNotesByRole(visibleNotes), [visibleNotes])
  const [collapsedNotes, setCollapsedNotes] = useState<Record<string, boolean>>({})

  if (visibleNotes.length === 0) return null

  return (
    <section className="mt-[26px] w-[min(694px,100%)]">
      <h2 className="mt-0 mb-[27px] flex items-center gap-2 text-xs font-extrabold tracking-[0.12em] text-faint uppercase"><i className="h-1.5 w-1.5 rounded-full bg-divider-strong" />Internal Notes</h2>
      <div className="grid gap-6">
        {groupedNotes.map((group) => (
          <section className="grid gap-3" key={group.role}>
            <h3 className="m-0 text-[11px] font-extrabold tracking-[0.12em] text-muted uppercase">{group.label}</h3>
            {group.notes.map((note) => {
              const visibleFields = (note.fields ?? []).filter((field) => role === 'human_resource' || field.visibility !== 'human_resource_only')
              const collapsed = collapsedNotes[note.id] ?? true
              return (
                <article className={`rounded-panel bg-surface-muted px-6 ${collapsed ? 'py-3.5' : 'py-[22px]'}`} key={note.id}>
                  <div className={`flex items-center justify-between gap-4 ${collapsed ? 'mb-0' : 'mb-3.5'}`}>
                    <span className="w-fit bg-white px-2 py-1 text-[11px] font-extrabold text-muted uppercase">{formatNoteAuthor(note, project)}</span>
                    <div className="inline-flex items-center gap-2.5">
                      <time className="text-xs text-faint">{formatDateTime(note.updatedAt ?? note.createdAt)}</time>
                      <button
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-white text-muted"
                        type="button"
                        aria-label={collapsed ? 'Expand note' : 'Collapse note'}
                        onClick={() => setCollapsedNotes((current) => ({ ...current, [note.id]: !collapsed }))}
                      >
                        <ChevronDown className={`transition-transform ${collapsed ? '' : 'rotate-180'}`} size={16} />
                      </button>
                    </div>
                  </div>
                  {!collapsed && (
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
