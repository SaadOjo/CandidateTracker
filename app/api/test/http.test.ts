import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import { AuthError, type AuthService } from '../src/auth.js'

test('all business routes require login before touching the database', async (t) => {
  const authService = { getSession: async () => { throw new AuthError(401, 'Authentication required') } } as AuthService
  const prisma = {} as PrismaClient
  const app = await buildApp({ prisma, authService, logger: false, config: { host: '127.0.0.1', port: 4000, origins: ['http://localhost:5174'], databaseUrl: 'postgresql://localhost/test', developmentPassword: 'test' } })
  t.after(() => app.close())

  for (const url of ['/users', '/projects', '/projects/example', '/candidates', '/candidates/example', '/rejection-follow-ups', '/integrations/rsc-simulator', '/integrations/rsc-simulator/project', '/integrations/rsc-simulator/projects']) {
    const response = await app.inject({ url })
    assert.equal(response.statusCode, 401, url)
  }
  const health = await app.inject({ url: '/health' })
  assert.deepEqual(health.json(), { ok: true })
  const mutation = await app.inject({ method: 'POST', url: '/candidates/example/transition', payload: { action: 'reject' } })
  assert.equal(mutation.statusCode, 401)
  for (const url of ['/integrations/rsc-simulator/import', '/projects/example/simulator-sync']) {
    assert.equal((await app.inject({ method: 'POST', url, payload: {} })).statusCode, 401)
  }
  const foreignOrigin = await app.inject({ method: 'POST', url: '/auth/logout', headers: { origin: 'https://foreign.example' } })
  assert.equal(foreignOrigin.statusCode, 403)
  const crossSite = await app.inject({ method: 'POST', url: '/auth/logout', headers: { 'sec-fetch-site': 'cross-site' } })
  assert.equal(crossSite.statusCode, 403)
})
