import type { Candidate, Project, User } from '../../app/web/src/domain/types'

export interface StoredProject extends Project {
  sourceKey?: string
  hiredApplicationId?: string
}
export interface StoredCandidate extends Candidate {
  sourceKey: string
  createdAt: string
  interviewStage?: string
}
export interface Person {
  id: string
  sourceKey: string
  name: string
  linkedinProfileUrl: string
  email: string | null
  phone: string | null
}
export interface Workspace {
  generation: number
  projects: StoredProject[]
  people: Person[]
  candidates: StoredCandidate[]
}
export interface SqlAdapter {
  exec(query: string, ...bindings: (string | number | null)[]): Iterable<Record<string, unknown>>
}
export interface StoredSession {
  userId: string
  expiresAt: number
}
export type DemoUser = User & { role: 'human_resource' | 'hiring_manager' }

// Only the dedicated Cloudflare workspace uses this storage. No PostgreSQL connection.
export class WorkspaceStorage {
  constructor(private sql: SqlAdapter) {
    sql.exec('CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY CHECK(id = 1), body TEXT NOT NULL)')
    sql.exec('CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL)')
    sql.exec('INSERT OR IGNORE INTO workspace (id, body) VALUES (1, ?)', JSON.stringify({ generation: 0, projects: [], people: [], candidates: [] }))
  }

  read(): Workspace {
    const row = [...this.sql.exec('SELECT body FROM workspace WHERE id = 1')][0]
    if (!row || typeof row.body !== 'string') throw new Error('Cloudflare workspace is missing')
    return JSON.parse(row.body)
  }

  write(workspace: Workspace) {
    this.sql.exec('UPDATE workspace SET body = ? WHERE id = 1', JSON.stringify(workspace))
  }

  session(tokenHash: string): StoredSession | null {
    const row = [...this.sql.exec('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?', tokenHash)][0]
    if (!row || Number(row.expires_at) <= Date.now()) return null
    return { userId: String(row.user_id), expiresAt: Number(row.expires_at) }
  }

  saveSession(tokenHash: string, userId: string) {
    this.sql.exec('DELETE FROM sessions WHERE expires_at <= ?', Date.now())
    this.sql.exec('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)', tokenHash, userId, Date.now() + 86400000)
  }

  deleteSession(tokenHash: string) {
    this.sql.exec('DELETE FROM sessions WHERE token_hash = ?', tokenHash)
  }
}
