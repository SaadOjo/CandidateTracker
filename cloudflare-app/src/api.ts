import { z, ZodError } from 'zod'
import { ApiError } from '../../app/api/src/errors'
import { CandidateStageSchema, CandidateTransitionSchema, CreateProjectSchema, ListCandidatesQuerySchema, ListProjectsQuerySchema, ListRejectionFollowUpsQuerySchema, ListUsersQuerySchema, LogRejectionContactAttemptSchema, UpdateProjectStageCommentSchema, UpsertCandidateNoteSchema } from '../../app/api/src/domain'
import { actor, assignment, candidateById, candidateResponse, createProject, importProject, now, projectById, projectResponse, rejectionContact, rejectionResponse, requireRole, saveComment, saveNote, syncCandidates, transition, users } from './model'
import { RscSource } from './rsc'
import type { DemoUser, Workspace } from './storage'
import { WorkspaceStorage } from './storage'

export const DEMO_PASSWORD = 'cloudflare-public-demo'
const cookieName = 'tracker_demo_session'
const importSchema = z.object({ sourceProjectId: z.string().min(1), hiringManagerUserIds: z.array(z.string().min(1)).min(1), assignedHumanResourceUserIds: z.array(z.string().min(1)).min(1) }).strict()
export async function hash(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}
async function body(request: Request) {
  const text = await request.text()
  if (text.length > 1048576) throw new ApiError(413, 'Request is too large')
  try { return JSON.parse(text) }
  catch { throw new ApiError(400, 'Invalid JSON request') }
}
const json = (value: unknown, status = 200, headers?: HeadersInit) => Response.json(value, { status, headers })
export class TrackerApi {
  constructor(readonly storage: WorkspaceStorage, readonly source: RscSource) {}

  mutate<T>(fn: (state: Workspace) => T): T {
    const state = this.storage.read()
    const result = fn(state)
    this.storage.write(state)
    return result
  }

  async sync(projectId: string) {
    const before = this.storage.read()
    const project = projectById(before, projectId)
    if (!project.simulatorTracking) throw new ApiError(404, 'Project is not linked to RSC')
    if (project.status !== 'active' || project.hiredApplicationId) throw new ApiError(409, 'Only active projects without a hire can import candidates')
    try {
      const snapshot = await this.source.snapshot(project.simulatorTracking.sourceProjectId)
      return this.mutate(state => {
        if (state.generation !== before.generation) throw new ApiError(409, 'Demo was reset; sync discarded')
        return { imported: syncCandidates(state, projectById(state, projectId), snapshot) }
      })
    } catch (error) {
      this.mutate(state => {
        if (state.generation !== before.generation) return
        const current = state.projects.find(item => item.id === projectId)
        if (current?.simulatorTracking) current.simulatorTracking.lastError = error instanceof ApiError ? error.message : 'RSC synchronization failed'
      })
      throw error
    }
  }

  async syncAll() {
    const state = this.storage.read()
    for (const project of state.projects.filter(item => item.simulatorTracking && item.status === 'active' && !item.hiredApplicationId)) {
      try { await this.sync(project.id) }
      catch { /* Each project's error is recorded by sync and displayed in its pipeline. */ }
    }
  }

  async fetch(request: Request): Promise<Response> {
    try { return await this.route(request) }
    catch (error) {
      if (error instanceof ApiError) return json({ error: error.message }, error.statusCode)
      if (error instanceof ZodError) return json({ error: 'Validation failed', details: error.issues }, 400)
      console.error('Cloudflare tracker request failed', error instanceof Error ? error.message : 'Unknown error')
      return json({ error: 'Internal server error' }, 500)
    }
  }

  private async route(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname.replace(/^\/api(?=\/|$)/, '')
    const method = request.method
    if (path === '/health' && method === 'GET') return json({ ok: true, deployment: 'cloudflare-demo' })
    if (path === '/auth/development/users' && method === 'GET') return json(users)
    if (path === '/auth/login' && method === 'POST') {
      const input = z.object({ email: z.email(), password: z.string() }).parse(await body(request))
      const user = users.find(item => item.email === input.email)
      if (!user || input.password !== DEMO_PASSWORD) throw new ApiError(401, 'Invalid demo account')
      const token = `${crypto.randomUUID()}${crypto.randomUUID()}`
      this.storage.saveSession(await hash(token), user.id)
      const secure = url.protocol === 'https:' ? '; Secure' : ''
      return json({ ...actor(user), userId: user.id, email: user.email, appRole: user.role }, 200, { 'Set-Cookie': `${cookieName}=${token}; HttpOnly; SameSite=Lax; Path=/api; Max-Age=86400${secure}` })
    }
    const token = request.headers.get('cookie')?.split(';').map(item => item.trim()).find(item => item.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1)
    const tokenHash = token ? await hash(token) : null
    const session = tokenHash ? this.storage.session(tokenHash) : null
    const user = session ? users.find(item => item.id === session.userId) : null
    if (!user) throw new ApiError(401, 'Sign in to the demo')
    if (path === '/auth/me' && method === 'GET') return json({ ...actor(user), userId: user.id, email: user.email, appRole: user.role })
    if (path === '/auth/logout' && method === 'POST') {
      this.storage.deleteSession(tokenHash!)
      return json({ ok: true }, 200, { 'Set-Cookie': `${cookieName}=; HttpOnly; SameSite=Lax; Path=/api; Max-Age=0${url.protocol === 'https:' ? '; Secure' : ''}` })
    }
    if (path === '/users' && method === 'GET') {
      const query = ListUsersQuerySchema.parse(Object.fromEntries(url.searchParams))
      return json(users.filter(item => !query.role || item.role === query.role))
    }
    if (path === '/demo/reset' && method === 'POST') {
      requireRole(user, 'human_resource')
      z.object({ confirmation: z.literal('DELETE ALL TEST DATA') }).strict().parse(await body(request))
      return json(this.mutate(state => {
        const removed = { projects: state.projects.length, candidates: state.candidates.length }
        state.generation++; state.projects = []; state.people = []; state.candidates = []
        return removed
      }))
    }
    if (path.startsWith('/integrations/rsc-simulator')) {
      requireRole(user, 'human_resource')
      if (path === '/integrations/rsc-simulator' && method === 'GET') return json({ enabled: true })
      if (path === '/integrations/rsc-simulator/projects' && method === 'GET') return json(await this.source.projects())
      if (path === '/integrations/rsc-simulator/project' && method === 'GET') {
        const sourceProjectId = z.string().min(1).parse(url.searchParams.get('sourceProjectId'))
        const snapshot = await this.source.snapshot(sourceProjectId)
        return json({ project: snapshot.project, candidateCount: snapshot.candidates.length, shortlistedCount: snapshot.candidates.filter(item => item.stage === 'shortlisted').length })
      }
      if (path === '/integrations/rsc-simulator/import' && method === 'POST') {
        const input = importSchema.parse(await body(request))
        assignment(input)
        const generation = this.storage.read().generation
        const snapshot = await this.source.snapshot(input.sourceProjectId)
        return json(this.mutate(state => {
          if (state.generation !== generation) throw new ApiError(409, 'Demo was reset; import discarded. Please try again.')
          return projectResponse(state, importProject(state, snapshot, input))
        }), 201)
      }
    }
    if (path === '/projects' && method === 'GET') {
      const query = ListProjectsQuerySchema.parse(Object.fromEntries(url.searchParams))
      const state = this.storage.read()
      const search = query.query?.trim().toLocaleLowerCase()
      return json(state.projects.filter(project => (!query.status || project.status === query.status) && (!search || `${project.name} ${project.position}`.toLocaleLowerCase().includes(search)))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(project => projectResponse(state, project)))
    }
    if (path === '/projects' && method === 'POST') {
      requireRole(user, 'human_resource')
      const input = CreateProjectSchema.parse(await body(request))
      return json(this.mutate(state => projectResponse(state, createProject(state, input))), 201)
    }
    const projectRoute = path.match(/^\/projects\/([^/]+)(?:\/(archive|simulator-sync|stage-comments)(?:\/([^/]+))?)?$/)
    if (projectRoute) {
      const [, projectId, action, stage] = projectRoute
      if (!action && method === 'GET') { const state = this.storage.read(); return json(projectResponse(state, projectById(state, projectId))) }
      if (action === 'simulator-sync' && method === 'POST') { requireRole(user, 'human_resource'); return json(await this.sync(projectId)) }
      if (!action && method === 'PUT') {
        requireRole(user, 'human_resource')
        const input = CreateProjectSchema.parse(await body(request))
        return json(this.mutate(state => {
          const project = projectById(state, projectId)
          Object.assign(project, input, assignment(input))
          return projectResponse(state, project)
        }))
      }
      if (action === 'archive' && method === 'PATCH') {
        requireRole(user, 'human_resource')
        return json(this.mutate(state => { const project = projectById(state, projectId); project.status = 'archived'; project.archivedAt = now(); return projectResponse(state, project) }))
      }
      if (action === 'stage-comments' && method === 'PATCH') {
        const parsedStage = CandidateStageSchema.parse(stage)
        if (parsedStage === 'pre_interview') requireRole(user, 'hiring_manager')
        const input = UpdateProjectStageCommentSchema.parse(await body(request))
        return json(this.mutate(state => { const project = projectById(state, projectId); saveComment(project, parsedStage, user, input.body); return projectResponse(state, project) }))
      }
    }
    if (path === '/candidates' && method === 'GET') {
      const query = ListCandidatesQuerySchema.parse(Object.fromEntries(url.searchParams))
      const search = query.query?.trim().toLocaleLowerCase()
      return json(this.storage.read().candidates.filter(candidate => (!query.projectId || candidate.projectId === query.projectId) && (!query.stage || candidate.stage === query.stage) && (!query.status || candidate.status === query.status) && (!search || candidate.name.toLocaleLowerCase().includes(search)))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(candidate => candidateResponse(candidate, user)))
    }
    const candidateRoute = path.match(/^\/candidates\/([^/]+)(?:\/(transition|note))?$/)
    if (candidateRoute) {
      const [, candidateId, action] = candidateRoute
      if (!action && method === 'GET') return json(candidateResponse(candidateById(this.storage.read(), candidateId), user))
      if (action === 'transition' && method === 'POST') {
        const input = CandidateTransitionSchema.parse(await body(request))
        return json(this.mutate(state => { const candidate = candidateById(state, candidateId); transition(state, candidate, user, input); return candidateResponse(candidate, user) }))
      }
      if (action === 'note' && method === 'PUT') {
        const input = UpsertCandidateNoteSchema.parse(await body(request))
        return json(this.mutate(state => { const candidate = candidateById(state, candidateId); saveNote(candidate, user, input); return candidateResponse(candidate, user) }))
      }
    }
    if (path === '/rejection-follow-ups' && method === 'GET') {
      requireRole(user, 'human_resource')
      const query = ListRejectionFollowUpsQuerySchema.parse(Object.fromEntries(url.searchParams))
      const state = this.storage.read()
      const search = query.query?.trim().toLocaleLowerCase()
      return json(state.candidates.filter(candidate => candidate.rejectionFollowUp && Date.parse(candidate.rejectionFollowUp.eligibleAt) <= Date.now() && (!query.projectId || candidate.projectId === query.projectId) && (!query.status || candidate.rejectionFollowUp.status === query.status) && (!search || candidate.name.toLocaleLowerCase().includes(search)))
        .map(candidate => rejectionResponse(state, candidate)).sort((a, b) => a.status.localeCompare(b.status) || a.eligibleAt.localeCompare(b.eligibleAt)))
    }
    const rejectionRoute = path.match(/^\/rejection-follow-ups\/([^/]+)\/contact-attempts$/)
    if (rejectionRoute && method === 'POST') {
      requireRole(user, 'human_resource')
      const input = LogRejectionContactAttemptSchema.parse(await body(request))
      return json(this.mutate(state => {
        const candidate = state.candidates.find(item => item.rejectionFollowUp?.id === rejectionRoute[1])
        if (!candidate) throw new ApiError(404, 'Rejection follow-up not found')
        rejectionContact(candidate, user, input)
        return rejectionResponse(state, candidate)
      }))
    }
    throw new ApiError(404, 'Route not found')
  }
}
