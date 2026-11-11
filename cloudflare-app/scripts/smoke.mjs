import assert from 'node:assert/strict'
const base = process.argv[2]
if (!['http://127.0.0.1:5182', 'https://candidate-tracker-test-demo.saadsaif0333.workers.dev'].includes(base)) throw new Error('Specify the dedicated tracker demo URL')
let cookie
async function request(path, method = 'GET', body, expected = 200) {
  const response = await fetch(`${base}/api${path}`, { method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const text = await response.text()
  assert.ok(response.headers.get('content-type')?.includes('application/json'), `${path}: expected JSON, received HTTP ${response.status}: ${text.slice(0,200)}`)
  const value = JSON.parse(text)
  assert.equal(response.status, expected, `${path}: ${JSON.stringify(value)}`)
  if (path === '/auth/login') cookie = response.headers.get('set-cookie').split(';')[0]
  return value
}
const login = email => request('/auth/login', 'POST', { email, password: 'cloudflare-public-demo' })
await request('/health')
await login('serenay@example.com')
assert.equal((await request('/projects')).length, 0, 'Smoke test requires an empty dedicated demo; it never deletes pre-existing projects')
const catalog = await request('/integrations/rsc-simulator/projects')
const source = catalog.find(project => project.exportedAt !== null)
assert.ok(source, 'Publish a fictional RSC project before running the smoke test')
const preview = await request(`/integrations/rsc-simulator/project?sourceProjectId=${encodeURIComponent(source.id)}`)
assert.ok(preview.shortlistedCount > 0)
const input = { sourceProjectId: source.id, hiringManagerUserIds: ['demo-ayca'], assignedHumanResourceUserIds: ['demo-serenay'] }
const project = await request('/integrations/rsc-simulator/import', 'POST', input, 201)
assert.equal(project.candidateCount, preview.shortlistedCount)
let candidates = await request(`/candidates?projectId=${project.id}`)
assert.ok(candidates.every(candidate => candidate.stage === 'pre_interview' && candidate.status === 'waiting_for_contact'))
assert.ok(candidates.every(candidate => candidate.email && candidate.phone))
const candidate = candidates[0]
await request(`/candidates/${candidate.id}/note`, 'PUT', { body: 'Temporary smoke verification', visibility: 'human_resource_only' })
await request(`/projects/${project.id}/stage-comments/pre_interview`, 'PATCH', { body: 'Forbidden HR write' }, 403)
await login('ayca@example.com')
await request(`/projects/${project.id}/stage-comments/pre_interview`, 'PATCH', { body: 'Temporary HM smoke comment' })
assert.equal((await request(`/candidates/${candidate.id}`)).notes.length, 0)
await request('/demo/reset', 'POST', { confirmation: 'DELETE ALL TEST DATA' }, 403)
await login('serenay@example.com')
assert.equal((await request(`/projects/${project.id}`)).stageComments[0].body, 'Temporary HM smoke comment')
assert.equal((await request(`/projects/${project.id}/simulator-sync`, 'POST')).imported, 0)
assert.equal((await request(`/candidates?projectId=${project.id}`)).length, candidates.length)
assert.deepEqual((await request('/projects')).map(item => item.id), [project.id])
assert.deepEqual(await request('/demo/reset', 'POST', { confirmation: 'DELETE ALL TEST DATA' }), { projects: 1, candidates: candidates.length })
assert.deepEqual(await request('/projects'), [])
assert.deepEqual(await request('/candidates'), [])
const clean = await request('/integrations/rsc-simulator/import', 'POST', input, 201)
candidates = await request(`/candidates?projectId=${clean.id}`)
assert.ok(candidates.every(item => item.notes.length === 0))
console.log(JSON.stringify({ ok: true, base, sourceProject: source.id, projectId: clean.id, candidateId: candidates[0].id, candidates: candidates.length, verified: ['RSC catalog and published snapshot', 'shortlisted import with email and phone', 'role permissions and private notes', 'HM comments shared with HR', 'idempotent sync', 'reset and re-import'] }, null, 2))
