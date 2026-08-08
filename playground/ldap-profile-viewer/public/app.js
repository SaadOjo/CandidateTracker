const form = document.querySelector('#ldap-form')
const usernameInput = document.querySelector('#username')
const passwordInput = document.querySelector('#password')
const submitButton = document.querySelector('#submit-button')
const buttonLabel = submitButton.querySelector('.button-label')
const buttonLoading = submitButton.querySelector('.button-loading')
const message = document.querySelector('#message')
const results = document.querySelector('#results')
const connectionTargets = document.querySelector('#connection-targets')
const transportBadge = document.querySelector('#transport-badge')
const transportWarning = document.querySelector('#transport-warning')

const sectionDefinitions = [
  {
    title: 'Identity',
    key: 'identity',
    fields: [
      ['Display name', 'displayName'],
      ['Given name', 'givenName'],
      ['Surname', 'surname'],
      ['Common name', 'commonName'],
      ['Username', 'username'],
      ['User principal name', 'userPrincipalName'],
      ['Employee ID', 'employeeId'],
      ['Employee number', 'employeeNumber'],
      ['Distinguished name', 'distinguishedName'],
    ],
  },
  {
    title: 'Organization',
    key: 'organization',
    fields: [
      ['Title', 'title'],
      ['Department', 'department'],
      ['Company', 'company'],
      ['Manager', 'manager'],
      ['Office', 'office'],
    ],
  },
  {
    title: 'Contact',
    key: 'contact',
    fields: [
      ['Email', 'email'],
      ['Phone', 'phone'],
      ['Mobile', 'mobile'],
      ['Address', 'address'],
    ],
  },
  {
    title: 'Account',
    key: 'account',
    fields: [
      ['Status', 'status'],
      ['Control code', 'controlCode'],
      ['Account expires', 'accountExpires', 'date'],
      ['Password last set', 'passwordLastSet', 'date'],
      ['Last logon', 'lastLogon', 'date'],
      ['Created', 'createdAt', 'date'],
      ['Last changed', 'changedAt', 'date'],
      ['Flags', 'flags', 'flags'],
    ],
  },
]

loadConfiguration()
usernameInput.focus()

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  hideMessage()
  results.hidden = true
  results.replaceChildren()

  const username = usernameInput.value.trim()
  let password = passwordInput.value
  if (!username || !password) {
    showMessage('Enter both your username and password.', 'error')
    return
  }

  setLoading(true)
  let requestBody = JSON.stringify({ username, password })
  passwordInput.value = ''
  password = ''

  try {
    const response = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    })
    requestBody = ''
    const payload = await response.json().catch(() => ({}))

    if (!response.ok) throw new Error(payload.error || `Request failed with status ${response.status}.`)
    renderProfiles(payload)
  } catch (error) {
    requestBody = ''
    showMessage(error instanceof Error ? error.message : 'Could not load the LDAP profile.', 'error')
    passwordInput.focus()
  } finally {
    setLoading(false)
  }
})

async function loadConfiguration() {
  try {
    const response = await fetch('/api/config')
    if (!response.ok) throw new Error('Configuration unavailable')
    const config = await response.json()

    connectionTargets.replaceChildren(
      ...config.hosts.map((host) => element('span', 'target-chip', `${host}:${config.port}`)),
    )
    transportBadge.textContent = config.startTls ? 'LDAP + StartTLS' : config.scheme === 'ldaps' ? 'LDAPS' : 'Plain LDAP'
    transportBadge.className = `transport-badge ${config.encrypted ? 'secure' : 'insecure'}`
    transportWarning.hidden = config.encrypted
  } catch {
    connectionTargets.textContent = 'Could not load local LDAP configuration.'
    transportBadge.textContent = 'Unknown transport'
  }
}

function renderProfiles(payload) {
  const { connection, profiles = [] } = payload
  const summary = element('section', 'lookup-summary')
  const connectionText = element('span')
  connectionText.append('Connected through ', element('strong', '', `${connection.host} · ${connection.transport}`))
  const baseText = element('span')
  baseText.append('Base DN: ', element('strong', '', connection.baseDn))
  summary.append(connectionText, baseText)
  results.append(summary)

  profiles.forEach((profile) => results.append(createProfileCard(profile)))
  results.hidden = false
  showMessage(`Loaded ${profiles.length} directory ${profiles.length === 1 ? 'profile' : 'profiles'}.`, 'info')
  results.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function createProfileCard(profile) {
  const card = element('article', 'profile-card')
  const header = element('header', 'profile-header')
  const title = element('div', 'profile-title')
  const avatar = element('span', 'profile-avatar', initialFor(profile.identity.displayName || profile.identity.username))
  const titleCopy = element('div')
  titleCopy.append(
    element('h2', '', profile.identity.displayName || profile.identity.commonName || profile.identity.username || 'Directory profile'),
    element('p', '', [profile.organization.title, profile.organization.department].filter(Boolean).join(' · ') || 'Active Directory account'),
  )
  title.append(avatar, titleCopy)
  header.append(title)

  if (profile.account.status) header.append(element('span', 'account-status', profile.account.status))
  card.append(header)

  const sections = element('div', 'profile-sections')
  sectionDefinitions.forEach((definition) => {
    sections.append(createDetailSection(definition, profile[definition.key] ?? {}))
  })
  card.append(sections, createGroupsSection(profile.groups ?? []))
  return card
}

function createDetailSection(definition, data) {
  const section = element('section', 'detail-section')
  section.append(element('h3', '', definition.title))
  const list = element('dl', 'detail-list')

  definition.fields.forEach(([label, key, format]) => {
    const row = element('div', 'detail-row')
    const term = element('dt', '', label)
    const description = element('dd')
    const value = data[key]

    if (format === 'flags') {
      const flags = Array.isArray(value) ? value : []
      if (flags.length > 0) {
        const flagList = element('span', 'account-flags')
        flags.forEach((flag) => flagList.append(element('span', 'flag-chip', flag)))
        description.append(flagList)
      } else {
        description.append(emptyValue())
      }
    } else {
      const displayValue = format === 'date' ? formatDate(value) : value
      description.append(displayValue === null || displayValue === undefined || displayValue === '' ? emptyValue() : document.createTextNode(String(displayValue)))
    }

    row.append(term, description)
    list.append(row)
  })

  section.append(list)
  return section
}

function createGroupsSection(groups) {
  const section = element('section', 'groups-section')
  section.append(element('h3', '', `Groups (${groups.length})`))
  const list = element('div', 'groups-list')

  if (groups.length === 0) list.append(emptyValue('No group memberships were returned.'))
  else groups.forEach((group) => list.append(element('span', 'group-chip', group)))

  section.append(list)
  return section
}

function formatDate(value) {
  if (!value || value === 'Never') return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date)
}

function initialFor(value) {
  return value?.trim()?.[0]?.toUpperCase() || '?'
}

function emptyValue(text = 'Not provided') {
  return element('span', 'empty-value', text)
}

function element(tagName, className = '', text = '') {
  const node = document.createElement(tagName)
  if (className) node.className = className
  if (text !== '') node.textContent = text
  return node
}

function setLoading(loading) {
  submitButton.disabled = loading
  usernameInput.disabled = loading
  passwordInput.disabled = loading
  buttonLabel.hidden = loading
  buttonLoading.hidden = !loading
}

function showMessage(text, tone) {
  message.textContent = text
  message.className = `message ${tone}`
  message.hidden = false
}

function hideMessage() {
  message.hidden = true
  message.textContent = ''
  message.className = 'message'
}
