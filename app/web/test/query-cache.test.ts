import assert from 'node:assert/strict'
import { test } from 'node:test'
import { QueryClient } from '@tanstack/react-query'
import { invalidateWorkflow } from '../src/app/queries/invalidateWorkflow'

test('workflow changes invalidate all affected views for the current user only', async () => {
  const client = new QueryClient()
  const affected = [['candidates', 'alice', 'detail', 'candidate'], ['projects', 'alice', 'list', {}], ['rejection-follow-ups', 'alice', 'list', {}]]
  affected.forEach((key) => client.setQueryData(key, {}))
  client.setQueryData(['projects', 'bob'], {})
  await invalidateWorkflow(client, 'alice')
  affected.forEach((key) => assert.equal(client.getQueryState(key)?.isInvalidated, true))
  assert.equal(client.getQueryState(['projects', 'bob'])?.isInvalidated, false)
  client.clear()
})
