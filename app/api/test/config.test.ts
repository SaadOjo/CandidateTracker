import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readConfig } from '../src/config.js'

const valid = {
  NODE_ENV: 'test', DATABASE_URL: 'postgresql://local:secret@localhost/test',
  AUTH_MODE: 'development', DEV_AUTH_PASSWORD: 'test-password', CORS_ORIGIN: 'http://localhost:5174',
}

test('configuration accepts explicit origins and defaults to a loopback listener', () => {
  const config = readConfig(valid)
  assert.equal(config.host, '127.0.0.1')
  assert.deepEqual(config.origins, ['http://localhost:5174'])
})

test('production cannot start with development authentication', () => {
  assert.throws(() => readConfig({ ...valid, NODE_ENV: 'production' }), /Production startup is blocked/)
})

test('simulator is opt-in and requires paired credentials and an allowed origin', () => {
  assert.equal(readConfig(valid).simulator, undefined)
  const settings = { RSC_SIMULATOR_URL: 'http://127.0.0.1:5180', RSC_SIMULATOR_TOKEN: 'test-token' }
  assert.deepEqual(readConfig({ ...valid, ...settings }).simulator, { url: settings.RSC_SIMULATOR_URL, token: settings.RSC_SIMULATOR_TOKEN, intervalMs: 5000 })
  assert.throws(() => readConfig({ ...valid, RSC_SIMULATOR_URL: settings.RSC_SIMULATOR_URL }))
  assert.throws(() => readConfig({ ...valid, RSC_SIMULATOR_TOKEN: settings.RSC_SIMULATOR_TOKEN }))
  for (const url of ['https://example.test', 'http://127.0.0.1:5180/path', 'http://user:pass@127.0.0.1:5180', 'http://127.0.0.1:5180?token=bad']) {
    assert.throws(() => readConfig({ ...valid, ...settings, RSC_SIMULATOR_URL: url }))
  }
})

test('only the explicitly named HTTPS cloud simulator origin is allowed', () => {
  const cloud = 'https://rsc-test-demo.saadsaif0333.workers.dev'
  const settings = { ...valid, RSC_SIMULATOR_URL: cloud, RSC_SIMULATOR_TOKEN: 'test-token' }
  assert.equal(readConfig(settings).simulator?.url, cloud)
  for (const url of [
    cloud.replace('https:', 'http:'), `${cloud}:444`, `${cloud}/simulator`, `${cloud}?token=bad`, `${cloud}#fragment`,
    cloud.replace('https://', 'https://user:pass@'), `${cloud}.example.com`, 'https://another.workers.dev',
    'https://127.0.0.1:5180',
  ]) {
    assert.throws(() => readConfig({ ...settings, RSC_SIMULATOR_URL: url }), /RSC_SIMULATOR_URL/)
  }
})

test('invalid configuration fails without leaking values', () => {
  assert.throws(() => readConfig({ ...valid, PORT: 'secret-value' }), (error: unknown) => {
    assert.ok(error instanceof Error)
    assert.match(error.message, /PORT/)
    assert.doesNotMatch(error.message, /secret-value/)
    return true
  })
  assert.throws(() => readConfig({ ...valid, CORS_ORIGIN: '*' }))
  assert.throws(() => readConfig({ ...valid, CORS_ORIGIN: 'https://app.example/path' }))
})
