import { DurableObject } from 'cloudflare:workers'
import { TrackerApi } from './api'
import { RscSource } from './rsc'
import { WorkspaceStorage } from './storage'

interface Env {
  ASSETS: Fetcher
  WORKSPACE: DurableObjectNamespace<TrackerWorkspace>
  RSC_SIMULATOR_TOKEN: string
}
export class TrackerWorkspace extends DurableObject<Env> {
  private api: TrackerApi
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.api = new TrackerApi(new WorkspaceStorage(ctx.storage.sql), new RscSource(env.RSC_SIMULATOR_TOKEN))
  }
  private async scheduleSync() {
    const active = this.api.storage.read().projects.some(project => project.simulatorTracking && project.status === 'active' && !project.hiredApplicationId)
    if (!active) await this.ctx.storage.deleteAlarm()
    else if (await this.ctx.storage.getAlarm() === null) await this.ctx.storage.setAlarm(Date.now() + 30000)
  }
  async fetch(request: Request) {
    const response = await this.api.fetch(request)
    await this.scheduleSync()
    return response
  }
  async alarm() {
    try { await this.api.syncAll() }
    finally { await this.scheduleSync() }
  }
}
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)
    const api = url.pathname === '/api' || url.pathname.startsWith('/api/')
    let response: Response
    if (api) {
      const origin = request.headers.get('origin')
      if ((origin && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
        response = Response.json({ error: 'Cross-origin requests are not allowed' }, { status: 403 })
      } else {
        response = await env.WORKSPACE.get(env.WORKSPACE.idFromName('public-fictional-demo-v1')).fetch(request)
      }
    } else response = await env.ASSETS.fetch(request)
    const result = new Response(response.body, response)
    result.headers.set('Cache-Control', 'no-store')
    result.headers.set('X-Content-Type-Options', 'nosniff')
    result.headers.set('Referrer-Policy', 'no-referrer')
    result.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
    return result
  },
} satisfies ExportedHandler<Env>
