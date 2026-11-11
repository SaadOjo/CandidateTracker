import { DurableObject } from 'cloudflare:workers'
import { handleApi } from './api.mjs'
import { WorkspaceStorage } from './storage.mjs'

export class DemoWorkspace extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env)
    this.storage = new WorkspaceStorage(ctx.storage.sql)
  }

  fetch(request) {
    return handleApi(request, this.storage)
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const api = url.pathname.startsWith('/simulator/') || url.pathname.startsWith('/rest/')
    let response
    const origin = request.headers.get('origin')
    if (api && ((origin && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site')) {
      response = Response.json({ error: 'Cross-origin requests are not allowed' }, { status: 403 })
    } else if (api) {
      response = await env.WORKSPACE.get(env.WORKSPACE.idFromName('shared-demo-v1')).fetch(request)
    } else {
      response = await env.ASSETS.fetch(request)
    }
    const result = new Response(response.body, response)
    result.headers.set('Cache-Control', 'no-store')
    result.headers.set('X-Content-Type-Options', 'nosniff')
    result.headers.set('Referrer-Policy', 'no-referrer')
    result.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
    return result
  },
}
