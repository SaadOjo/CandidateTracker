export class WorkspaceStorage {
  constructor(sql) {
    this.sql = sql
    sql.exec('CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, body TEXT NOT NULL)')
    sql.exec('CREATE TABLE IF NOT EXISTS exports (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, body TEXT NOT NULL)')
    sql.exec('CREATE INDEX IF NOT EXISTS exports_project ON exports (project_id)')
  }

  readProject(id) {
    const row = [...this.sql.exec('SELECT body FROM projects WHERE id = ?', id)][0]
    return row ? JSON.parse(row.body) : undefined
  }

  saveProject(id, state) {
    this.sql.exec('INSERT INTO projects (id, body) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET body = excluded.body', id, JSON.stringify(state))
  }

  sourceProject(id) {
    return [...this.sql.exec('SELECT project_id FROM exports WHERE id = ?', id)][0]?.project_id
  }

  exportsFor(projectId) {
    const sql = this.sql
    return {
      get size() {
        return [...sql.exec('SELECT COUNT(*) AS count FROM exports WHERE project_id = ?', projectId)][0].count
      },
      get(id) {
        const row = [...sql.exec('SELECT body FROM exports WHERE id = ? AND project_id = ?', id, projectId)][0]
        return row ? JSON.parse(row.body) : undefined
      },
      set(id, entry) {
        sql.exec('INSERT INTO exports (id, project_id, body) VALUES (?, ?, ?)', id, projectId, JSON.stringify(entry))
      },
      *values() {
        for (const row of sql.exec('SELECT body FROM exports WHERE project_id = ? ORDER BY rowid', projectId)) {
          yield JSON.parse(row.body)
        }
      },
    }
  }
}
