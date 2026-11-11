import type {
  Candidate,
  CandidateFilters,
  CandidateNoteInput,
  CandidateTransitionAction,
  CandidateTransitionInput,
  Project,
  ProjectFormInput,
  ProjectStatus,
  RejectionContactAttemptInput,
  RejectionFollowUp,
  RejectionFollowUpStatus,
  User,
  UserRole,
} from '../domain/types'

const API_BASE_URL = import.meta.env.VITE_API_URL

if (!API_BASE_URL) throw new Error('VITE_API_URL is required')

export class ApiRequestError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string, options?: ErrorOptions) {
    super(message, options)
    this.statusCode = statusCode
  }
}

export async function listUsers(role?: UserRole, signal?: AbortSignal) {
  const params = new URLSearchParams()
  if (role) params.set('role', role)
  return apiRequest<User[]>(`/users${withQuery(params)}`, { signal })
}

export async function listProjects(filters: { status?: ProjectStatus; query?: string } = {}, signal?: AbortSignal) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.query?.trim()) params.set('query', filters.query.trim())
  return apiRequest<Project[]>(`/projects${withQuery(params)}`, { signal })
}

export async function getProject(projectId: string, signal?: AbortSignal) {
  return apiRequest<Project>(`/projects/${encodeURIComponent(projectId)}`, { signal })
}

export async function listCandidates(filters: CandidateFilters = {}, signal?: AbortSignal) {
  const params = new URLSearchParams()
  if (filters.projectId) params.set('projectId', filters.projectId)
  if (filters.stage) params.set('stage', filters.stage)
  if (filters.status) params.set('status', filters.status)
  if (filters.query?.trim()) params.set('query', filters.query.trim())
  return apiRequest<Candidate[]>(`/candidates${withQuery(params)}`, { signal })
}

export async function getCandidate(candidateId: string, signal?: AbortSignal) {
  return apiRequest<Candidate>(`/candidates/${encodeURIComponent(candidateId)}`, { signal })
}

export async function listRejectionFollowUps(filters: { projectId?: string; status?: RejectionFollowUpStatus; query?: string } = {}, signal?: AbortSignal) {
  const params = new URLSearchParams()
  if (filters.projectId) params.set('projectId', filters.projectId)
  if (filters.status) params.set('status', filters.status)
  if (filters.query?.trim()) params.set('query', filters.query.trim())
  return apiRequest<RejectionFollowUp[]>(`/rejection-follow-ups${withQuery(params)}`, { signal })
}

export async function logRejectionContactAttempt(followUpId: string, input: RejectionContactAttemptInput) {
  return apiRequest<RejectionFollowUp>(`/rejection-follow-ups/${followUpId}/contact-attempts`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function transitionCandidate(candidateId: string, input: CandidateTransitionAction | CandidateTransitionInput) {
  const body = typeof input === 'string' ? { action: input } : input
  return apiRequest<Candidate>(`/candidates/${candidateId}/transition`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function upsertCandidateNote(candidateId: string, input: CandidateNoteInput) {
  return apiRequest<Candidate>(`/candidates/${candidateId}/note`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function updateProjectStageComment(projectId: string, stage: string, body: string) {
  return apiRequest<Project>(`/projects/${projectId}/stage-comments/${stage}`, {
    method: 'PATCH',
    body: JSON.stringify({ body }),
  })
}

export async function createProject(input: ProjectFormInput) {
  return apiRequest<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export interface SimulatorProjectPreview {
  project: { id: string; name: string; position: string; company: string }
  candidateCount: number
  shortlistedCount: number
}

export function getSimulatorStatus(signal?: AbortSignal) {
  return apiRequest<{ enabled: boolean }>('/integrations/rsc-simulator', { signal })
}

export interface SimulatorProjectChoice { id: string; name: string; exportedAt: number | null }

export function getSimulatorProjects() {
  return apiRequest<SimulatorProjectChoice[]>('/integrations/rsc-simulator/projects')
}

export function getSimulatorProject(sourceProjectId: string) {
  return apiRequest<SimulatorProjectPreview>(`/integrations/rsc-simulator/project?sourceProjectId=${encodeURIComponent(sourceProjectId)}`)
}

export function importSimulatorProject(sourceProjectId: string, input: ProjectFormInput) {
  return apiRequest<Project>('/integrations/rsc-simulator/import', { method: 'POST', body: JSON.stringify({
    sourceProjectId, hiringManagerUserIds: input.hiringManagerUserIds, assignedHumanResourceUserIds: input.assignedHumanResourceUserIds,
  }) })
}

export function syncSimulatorProject(projectId: string) {
  return apiRequest<{ imported: number }>(`/projects/${encodeURIComponent(projectId)}/simulator-sync`, { method: 'POST' })
}

export async function updateProject(projectId: string, input: ProjectFormInput) {
  return apiRequest<Project>(`/projects/${projectId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function archiveProject(projectId: string) {
  return apiRequest<Project>(`/projects/${projectId}/archive`, {
    method: 'PATCH',
  })
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: buildHeaders(init),
  })

  if (!response.ok) {
    let payload: unknown
    try {
      payload = await response.json()
    } catch (error) {
      throw new ApiRequestError(response.status, `API request failed with status ${response.status} and returned invalid JSON`, { cause: error })
    }

    if (!isApiErrorPayload(payload)) {
      throw new ApiRequestError(response.status, `API request failed with status ${response.status} and returned no error message`)
    }
    throw new ApiRequestError(response.status, payload.error)
  }

  return response.json() as Promise<T>
}

function buildHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers)
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  return headers
}

function isApiErrorPayload(payload: unknown): payload is { error: string } {
  return typeof payload === 'object'
    && payload !== null
    && 'error' in payload
    && typeof payload.error === 'string'
    && payload.error.length > 0
}

function withQuery(params: URLSearchParams) {
  const query = params.toString()
  return query ? `?${query}` : ''
}
