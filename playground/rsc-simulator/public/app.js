const $ = (id) => document.getElementById(id)
let state
let activeId
let selected = new Set()
let inspected
let busy = false
let projectBusy = false
let stageBusy = false
let projectId

const projectPath = (path) => `${path}?projectId=${encodeURIComponent(projectId)}`

const nameOf = (person) => `${person.firstName} ${person.lastName}`
const initials = (person) => `${person.firstName[0]}${person.lastName[0]}`
const timestamp = (value) => new Date(value).toLocaleString()

function element(tag, text, className) {
  const node = document.createElement(tag)
  if (text !== undefined) node.textContent = text
  if (className) node.className = className
  return node
}

async function api(path, options = {}) {
  const response = await fetch(path, options)
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`)
  return body
}

function report(error) {
  $('error').textContent = error.message
  $('error').hidden = false
}

function renderProjectExport() {
  const { exportedAt, hasUnexportedChanges } = state.projectExport
  $('project-export-status').textContent = exportedAt === null ? 'Not exported' : hasUnexportedChanges ? 'Unexported stage changes' : 'All stage changes exported'
  $('project-export-time').textContent = exportedAt === null ? '' : `Last exported: ${timestamp(exportedAt)}`
  $('project-download').hidden = exportedAt === null
  $('project-download').href = projectPath('/simulator/project-download')
  $('project-select').disabled = projectBusy || stageBusy || busy
  $('export-project').disabled = projectBusy || stageBusy
  $('export-project').textContent = projectBusy ? 'Exporting...' : 'Export Project'
}

function showView(view) {
  for (const key of ['candidates', 'exports']) {
    const active = view === key
    $(`${key}-view`).hidden = !active
    $(`${key}-tab`).classList.toggle('active', active)
    $(`${key}-tab`).setAttribute('aria-pressed', String(active))
  }
}

function field(label, value, code = false) {
  const node = element('div')
  const dd = element('dd')
  dd.append(element(code ? 'code' : 'span', value))
  node.append(element('dt', label), dd)
  return node
}

function renderProfile() {
  const person = state.candidates.find((candidate) => candidate.id === activeId)
  const profile = $('profile')
  profile.replaceChildren()
  if (!person) return
  const fields = element('dl', undefined, 'profile-fields')
  fields.append(field('Location', `${person.location.locationName} (${person.location.countryCode})`),
    field('Employer', person.currentEmployerNames.join(', ')), field('Member ID', person.member, true))
  profile.append(element('div', initials(person), 'avatar profile-avatar'), element('h2', nameOf(person)),
    element('p', person.headline, 'headline'), fields)
}

function stageSelector(person) {
  const stageSelect = element('select', undefined, 'row-stage')
  stageSelect.setAttribute('aria-label', `Stage for ${nameOf(person)}`)
  stageSelect.disabled = projectBusy || stageBusy
  for (const stage of state.pipelineStages) {
    const option = element('option', stage === 'shortlisted' ? 'shortlisted' : stage[0].toUpperCase() + stage.slice(1))
    option.value = stage
    stageSelect.append(option)
  }
  stageSelect.value = person.stage
  stageSelect.addEventListener('change', async () => {
    const nextStage = stageSelect.value
    stageBusy = true
    renderProjectExport()
    renderCandidates()
    $('error').hidden = true
    try {
      await api(projectPath(`/simulator/candidates/${person.id}`), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: nextStage }),
      })
      state = await api(projectPath('/simulator/state'))
      $('notice').textContent = `${nameOf(person)} moved to ${nextStage}.`
    } catch (error) { report(error) }
    finally { stageBusy = false; renderProjectExport(); renderCandidates(); renderProfile() }
  })
  return stageSelect
}

function visibleCandidates() {
  const query = $('search').value.trim().toLowerCase()
  return state.candidates.filter((person) => `${nameOf(person)} ${person.headline} ${person.location.locationName}`.toLowerCase().includes(query))
}

function renderCandidates() {
  const people = visibleCandidates()
  const exported = new Set(state.exports.flatMap((entry) => entry.candidateIds))
  $('candidate-list').replaceChildren()
  for (const person of people) {
    const row = element('li', undefined, `candidate-row${activeId === person.id ? ' active' : ''}`)
    const checkbox = element('input')
    checkbox.type = 'checkbox'
    checkbox.checked = selected.has(person.id)
    checkbox.setAttribute('aria-label', `Select ${nameOf(person)}`)
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selected.add(person.id)
      else selected.delete(person.id)
      renderSelection()
    })
    const button = element('button', undefined, 'person')
    button.type = 'button'
    button.setAttribute('aria-label', `View ${nameOf(person)}`)
    const text = element('span', undefined, 'person-text')
    text.append(element('strong', nameOf(person)), element('small', person.headline), element('small', person.location.locationName, 'location'))
    if (exported.has(person.member)) text.append(element('span', 'Prepared', 'exported-label'))
    button.append(element('span', initials(person), 'avatar'), text)
    button.addEventListener('click', () => { activeId = person.id; renderCandidates(); renderProfile() })
    row.append(checkbox, button, stageSelector(person))
    $('candidate-list').append(row)
  }
  $('result-count').textContent = `${people.length} of ${state.candidates.length}`
  $('empty').hidden = people.length > 0
  renderSelection()
}

function renderSelection() {
  const visible = visibleCandidates()
  const count = visible.filter((person) => selected.has(person.id)).length
  $('select-all').checked = visible.length > 0 && count === visible.length
  $('select-all').indeterminate = count > 0 && count < visible.length
  $('select-all').disabled = !visible.length
  $('selected-count').textContent = `${selected.size} selected`
  $('prepare').disabled = !selected.size || busy
  $('prepare').textContent = busy ? 'Preparing...' : `Prepare RSC Export${selected.size ? ` (${selected.size})` : ''}`
}

function renderHistory() {
  $('export-count').textContent = state.exports.length
  $('no-exports').hidden = state.exports.length > 0
  $('export-list').replaceChildren()
  for (const entry of state.exports) {
    const row = element('li', undefined, 'export-row')
    const details = element('div')
    details.append(element('strong', `${entry.count} candidate${entry.count === 1 ? '' : 's'}`),
      element('small', timestamp(entry.requestedAt)), element('code', entry.id))
    const button = element('button', 'Inspect')
    button.type = 'button'
    button.setAttribute('aria-label', `Inspect export ${entry.id}`)
    button.addEventListener('click', async () => {
      try { openInspector(await api(`/simulator/exports/${entry.id}`)) }
      catch (error) { report(error) }
    })
    row.append(details, button)
    $('export-list').append(row)
  }
}

function payloadValue() {
  return $('payload-type').value === 'headers' ? inspected.notificationHeaders : inspected[$('payload-type').value]
}

function renderPayload() { $('payload').textContent = JSON.stringify(payloadValue(), null, 2) }

function openInspector(entry) {
  inspected = entry
  $('request-id').textContent = entry.notification.id
  $('expires').textContent = timestamp(entry.notification.expiresAt)
  $('verification').textContent = ''
  $('payload-type').value = 'notification'
  renderPayload()
  $('inspector').showModal()
}

$('search').addEventListener('input', () => renderCandidates())
$('export-project').addEventListener('click', async () => {
  if (projectBusy || stageBusy) return
  projectBusy = true
  $('error').hidden = true
  renderProjectExport()
  renderCandidates()
  renderProfile()
  try {
    await api(projectPath('/simulator/project-export'), { method: 'POST' })
    state = await api(projectPath('/simulator/state'))
    $('notice').textContent = `Project exported: ${state.candidates.length} candidates. ${state.candidates.filter((person) => person.stage === 'shortlisted').length} shortlisted.`
  } catch (error) { report(error) }
  finally { projectBusy = false; renderProjectExport(); renderCandidates(); renderProfile() }
})
$('select-all').addEventListener('change', () => {
  for (const person of visibleCandidates()) {
    if ($('select-all').checked) selected.add(person.id)
    else selected.delete(person.id)
  }
  renderCandidates()
})
$('candidates-tab').addEventListener('click', () => showView('candidates'))
$('exports-tab').addEventListener('click', () => showView('exports'))
$('close-inspector').addEventListener('click', () => $('inspector').close())
$('payload-type').addEventListener('change', renderPayload)
$('download').addEventListener('click', () => {
  const anchor = element('a')
  anchor.href = `/simulator/exports/${inspected.notification.id}?download=${$('payload-type').value}`
  anchor.download = `rsc-${$('payload-type').value}-${inspected.notification.id}.json`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
})
$('verify').addEventListener('click', async () => {
  $('verify').disabled = true
  try {
    const result = await api(inspected.request.path, { headers: inspected.request.headers })
    $('verification').textContent = `200 OK: ${result.elements.length} candidate${result.elements.length === 1 ? '' : 's'} retrieved.`
  } catch (error) { $('verification').textContent = error.message }
  finally { $('verify').disabled = false }
})
$('export-form').addEventListener('submit', async (event) => {
  event.preventDefault()
  if (busy || !selected.size) return
  busy = true
  renderProjectExport()
  $('error').hidden = true
  renderSelection()
  try {
    const entry = await api(projectPath('/simulator/exports'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateIds: [...selected], notes: $('notes').value }),
    })
    state = await api(projectPath('/simulator/state'))
    selected = new Set()
    $('notes').value = ''
    $('notice').textContent = `Export prepared for ${entry.response.elements.length} candidate(s). No delivery attempted.`
    renderCandidates()
    renderHistory()
    openInspector(entry)
  } catch (error) { report(error) }
  finally { busy = false; renderSelection(); renderProjectExport() }
})

async function loadProject(id) {
  const snapshot = await api(`/simulator/state?projectId=${encodeURIComponent(id)}`)
  projectId = id
  state = snapshot
  selected = new Set()
  $('search').value = ''
  $('notes').value = ''
  $('notice').textContent = ''
  $('project-select').value = id
  activeId = state.candidates[0]?.id
  $('project-name').textContent = state.project.name
  $('project-meta').textContent = `${state.project.company} / ${state.project.location}`
  $('requisition').textContent = state.project.referenceEntityId
  $('owner').textContent = state.project.owner
  $('version').textContent = state.apiVersion
  $('candidate-count').textContent = state.candidates.length
  renderCandidates()
  renderProfile()
  renderProjectExport()
  renderHistory()
}

$('project-select').addEventListener('change', async () => {
  const id = $('project-select').value
  projectBusy = true
  renderProjectExport()
  renderCandidates()
  $('error').hidden = true
  try { await loadProject(id) }
  catch (error) { $('project-select').value = projectId; report(error) }
  finally { projectBusy = false; renderProjectExport(); renderCandidates() }
})

try {
  const catalog = await api('/simulator/projects')
  if (!catalog.projects.length) throw new Error('No simulator projects available')
  for (const project of catalog.projects) {
    const option = element('option', project.name)
    option.value = project.id
    $('project-select').append(option)
  }
  await loadProject(catalog.projects[0].id)
} catch (error) { report(error) }
