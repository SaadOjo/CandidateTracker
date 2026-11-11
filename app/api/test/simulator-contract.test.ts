import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SimulatorProjectSchema } from '../src/features/simulator-import/contract.js'

const project = {
  contract: 'candidate-tracker-simulator-project-v1', integrationContext: 'urn:li:organization:test',
  project: { id: 'project', name: 'Project', position: 'Engineer', company: 'Example', location: 'Istanbul', owner: 'Owner', referenceEntityType: 'REQUISITION', referenceEntityId: 'req' },
  pipelineStages: ['shortlisted'],
  candidates: [{
    id: 'person', firstName: 'Sam', lastName: 'Example', headline: 'Engineer', currentEmployerNames: [],
    location: { countryCode: 'TR', locationName: 'Istanbul' }, member: 'urn:li:person:test',
    profileUrl: 'https://linkedin.invalid/test', stage: 'shortlisted',
  }],
}

test('custom simulator contacts are optional and valid strings survive parsing', () => {
  assert.equal(SimulatorProjectSchema.parse(project).candidates[0].email, undefined)
  const parsed = SimulatorProjectSchema.parse({ ...project, candidates: [{ ...project.candidates[0], email: ' sam@example.com ', phone: ' +1 202 555 0101 ' }] })
  assert.equal(parsed.candidates[0].email, 'sam@example.com')
  assert.equal(parsed.candidates[0].phone, '+1 202 555 0101')
})

test('invalid supplied contacts fail the export instead of being silently discarded', () => {
  for (const contacts of [{ email: 'invalid' }, { email: '' }, { email: null }, { phone: '' }, { phone: '  ' }, { phone: 123 }, { phone: { number: '123' } }]) {
    assert.equal(SimulatorProjectSchema.safeParse({ ...project, candidates: [{ ...project.candidates[0], ...contacts }] }).success, false)
  }
})
