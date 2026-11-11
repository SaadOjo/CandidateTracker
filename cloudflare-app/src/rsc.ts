import { ApiError } from '../../app/api/src/errors'
import { SimulatorCatalogSchema, SimulatorProjectSchema } from '../../app/api/src/features/simulator-import/contract'

export const RSC_ORIGIN = 'https://rsc-test-demo.saadsaif0333.workers.dev'

export class RscSource {
  constructor(private token: string, private request: typeof fetch = fetch) {
    if (!token) throw new Error('RSC_SIMULATOR_TOKEN is required')
  }

  private async read(path: string) {
    let response: Response
    try {
      const request = this.request
      response = await request(`${RSC_ORIGIN}${path}`, {
        headers: { Authorization: `Bearer ${this.token}` }, redirect: 'manual', signal: AbortSignal.timeout(10000),
      })
    } catch (error) {
      console.error('RSC fetch failed', error instanceof Error ? error.message : 'Unknown network error')
      throw new ApiError(502, 'RSC demo is unreachable')
    }
    if (response.status === 409) throw new ApiError(409, 'Publish this project with Export Project in RSC first.')
    if (!response.ok) throw new ApiError(502, `RSC returned HTTP ${response.status}`)
    try { return await response.json() }
    catch { throw new ApiError(502, 'RSC returned invalid JSON') }
  }

  async projects() {
    const parsed = SimulatorCatalogSchema.safeParse(await this.read('/simulator/projects'))
    if (!parsed.success) throw new ApiError(502, 'RSC returned an invalid project catalog')
    return parsed.data.projects
  }

  async snapshot(projectId: string) {
    const parsed = SimulatorProjectSchema.safeParse(await this.read(`/simulator/project-export?projectId=${encodeURIComponent(projectId)}`))
    if (!parsed.success) throw new ApiError(502, 'RSC returned an invalid project export')
    if (parsed.data.project.id !== projectId) throw new ApiError(409, 'RSC returned a different project')
    return parsed.data
  }
}
