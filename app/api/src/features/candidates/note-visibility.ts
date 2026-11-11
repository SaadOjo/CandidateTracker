import type { Role } from '@prisma/client'
import { NoteFieldSchema } from '../../domain.js'
import type { z } from 'zod'

interface StoredNote {
  visibility: string
  fields: unknown
}

export function visibleNotes<T extends StoredNote>(notes: T[], role: Role) {
  const canReadPrivate = role === 'human_resource' || role === 'admin'
  return notes.flatMap<Omit<T, 'fields'> & { fields: z.infer<typeof NoteFieldSchema>[] | null }>((note) => {
    if (note.visibility !== 'all' && note.visibility !== 'human_resource_only') {
      throw new Error('Invalid stored note visibility')
    }
    if (!canReadPrivate && note.visibility === 'human_resource_only') return []
    if (note.fields === null) return [{ ...note, fields: null }]
    const parsed = NoteFieldSchema.array().safeParse(note.fields)
    if (!parsed.success) throw new Error('Invalid stored note fields')
    return [{ ...note, fields: parsed.data.filter((field) => canReadPrivate || field.visibility === 'all') }]
  })
}
