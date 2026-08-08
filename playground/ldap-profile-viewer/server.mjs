import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP_ROOT = dirname(fileURLToPath(import.meta.url))
const PUBLIC_ROOT = join(APP_ROOT, 'public')
const HOST = process.env.HOST ?? '127.0.0.1'
const PORT = parsePort(process.env.PORT, 4174)
const LDAP_HOSTS = (process.env.LDAP_HOSTS ?? '10.40.100.101 10.40.100.102')
  .split(/[\s,]+/)
  .map((value) => value.trim())
  .filter(Boolean)
const LDAP_SCHEME = process.env.LDAP_SCHEME === 'ldaps' ? 'ldaps' : 'ldap'
const LDAP_PORT = parsePort(process.env.LDAP_PORT, LDAP_SCHEME === 'ldaps' ? 636 : 389)
const LDAP_STARTTLS = process.env.LDAP_STARTTLS === '1'
const LDAP_BASE_DN = process.env.LDAP_BASE_DN?.trim() ?? ''
const LDAP_DEFAULT_DOMAIN_NETBIOS = process.env.LDAP_DEFAULT_DOMAIN_NETBIOS?.trim() || 'TOKENINC'
const LDAP_DEFAULT_UPN_SUFFIX = process.env.LDAP_DEFAULT_UPN_SUFFIX?.trim() || 'tokeninc.com'
const LDAP_TIMEOUT_MS = parsePositiveInteger(process.env.LDAP_TIMEOUT_MS, 10_000)
const MAX_BODY_BYTES = 16 * 1024
const MAX_LDAP_OUTPUT_BYTES = 2 * 1024 * 1024

const LDAP_ATTRIBUTES = [
  'dn',
  'cn',
  'displayName',
  'givenName',
  'sn',
  'mail',
  'userPrincipalName',
  'sAMAccountName',
  'employeeID',
  'employeeNumber',
  'title',
  'department',
  'company',
  'manager',
  'physicalDeliveryOfficeName',
  'memberOf',
  'telephoneNumber',
  'mobile',
  'streetAddress',
  'l',
  'st',
  'postalCode',
  'userAccountControl',
  'accountExpires',
  'pwdLastSet',
  'lastLogonTimestamp',
  'whenCreated',
  'whenChanged',
]

const staticFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
])

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.statusCode = statusCode
  }
}

class LdapError extends Error {
  constructor(message, { exitCode, stderr = '', timedOut = false } = {}) {
    super(message)
    this.exitCode = exitCode
    this.stderr = stderr
    this.timedOut = timedOut
  }
}

const server = createServer(async (request, response) => {
  setSecurityHeaders(response)

  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? `127.0.0.1:${PORT}`}`)

    if (request.method === 'GET' && url.pathname === '/api/config') {
      return sendJson(response, 200, {
        hosts: LDAP_HOSTS,
        scheme: LDAP_SCHEME,
        port: LDAP_PORT,
        startTls: LDAP_STARTTLS,
        encrypted: LDAP_SCHEME === 'ldaps' || LDAP_STARTTLS,
      })
    }

    if (request.method === 'POST' && url.pathname === '/api/profile') {
      requireLocalOrigin(request)
      requireJsonContentType(request)
      const body = await readJsonBody(request)
      const username = validateCredentialField(body.username, 'Username', 254)
      const password = validateCredentialField(body.password, 'Password', 2048, false)
      const result = await lookupOwnProfile(username, password)
      return sendJson(response, 200, result)
    }

    if (request.method === 'GET' && staticFiles.has(url.pathname)) {
      const [fileName, contentType] = staticFiles.get(url.pathname)
      const content = await readFile(join(PUBLIC_ROOT, fileName))
      response.writeHead(200, { 'Content-Type': contentType, 'Content-Length': content.length })
      return response.end(content)
    }

    return sendJson(response, 404, { error: 'Not found.' })
  } catch (error) {
    if (error instanceof HttpError) {
      return sendJson(response, error.statusCode, { error: error.message })
    }

    console.error('LDAP profile request failed:', error instanceof Error ? error.message : error)
    return sendJson(response, 500, { error: 'Unexpected local server error.' })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`LDAP Profile Viewer running at http://${HOST}:${PORT}`)
  console.log(`LDAP targets: ${LDAP_HOSTS.join(', ')} (${LDAP_SCHEME}:${LDAP_PORT}${LDAP_STARTTLS ? ', StartTLS' : ''})`)
  if (LDAP_SCHEME === 'ldap' && !LDAP_STARTTLS) {
    console.warn('Warning: the LDAP connection is not encrypted. Set LDAP_STARTTLS=1 or use LDAPS if supported.')
  }
})

async function lookupOwnProfile(username, password) {
  if (LDAP_HOSTS.length === 0) throw new HttpError(500, 'No LDAP hosts are configured.')

  const tempDirectory = await mkdtemp(join(tmpdir(), 'ldap-profile-viewer-'))
  const passwordFile = join(tempDirectory, 'bind-password')

  try {
    await writeFile(passwordFile, password, { mode: 0o600 })
    await chmod(passwordFile, 0o600)
    password = ''

    const bindCandidates = getBindCandidates(username)
    const failures = []
    let connection = null

    for (const bindUser of bindCandidates) {
      for (const host of LDAP_HOSTS) {
        try {
          const rootDse = await runLdapSearch({
            host,
            bindUser,
            passwordFile,
            searchArgs: ['-s', 'base', '-b', '', 'defaultNamingContext', 'namingContexts'],
          })
          connection = { host, bindUser, rootDse }
          break
        } catch (error) {
          failures.push(error)
        }
      }
      if (connection) break
    }

    if (!connection) {
      const invalidCredentials = failures.some((failure) => /invalid credentials|data\s+52e/i.test(failure.stderr ?? ''))
      if (invalidCredentials) throw new HttpError(401, 'Authentication failed. Check your username and password.')
      throw new HttpError(502, 'Could not connect and bind to either LDAP server. Check VPN and LDAP transport settings.')
    }

    const rootEntries = parseLdif(connection.rootDse)
    const baseDn = LDAP_BASE_DN || firstValue(rootEntries[0], 'defaultNamingContext') || firstValue(rootEntries[0], 'namingContexts')
    if (!baseDn) throw new HttpError(502, 'LDAP bind succeeded, but the directory base DN could not be discovered.')

    const accountName = normalizeAccountName(username)
    const escapedInput = escapeLdapFilter(username)
    const escapedAccountName = escapeLdapFilter(accountName)
    const filter = `(|(sAMAccountName=${escapedAccountName})(userPrincipalName=${escapedInput})(mail=${escapedInput}))`

    let searchOutput
    try {
      searchOutput = await runLdapSearch({
        host: connection.host,
        bindUser: connection.bindUser,
        passwordFile,
        searchArgs: ['-b', baseDn, '-s', 'sub', '-z', '5', filter, ...LDAP_ATTRIBUTES],
      })
    } catch (error) {
      throw new HttpError(502, friendlyLdapError(error, 'The account search failed.'))
    }

    const entries = parseLdif(searchOutput).filter((entry) => firstValue(entry, 'dn'))
    if (entries.length === 0) throw new HttpError(404, 'Authentication succeeded, but no matching directory profile was found.')

    return {
      connection: {
        host: connection.host,
        bindUser: connection.bindUser,
        baseDn,
        transport: LDAP_STARTTLS ? 'LDAP with StartTLS' : LDAP_SCHEME === 'ldaps' ? 'LDAPS' : 'LDAP',
        encrypted: LDAP_SCHEME === 'ldaps' || LDAP_STARTTLS,
      },
      profiles: entries.map(toProfile),
    }
  } finally {
    await rm(tempDirectory, { recursive: true, force: true })
  }
}

function runLdapSearch({ host, bindUser, passwordFile, searchArgs }) {
  const args = [
    '-LLL',
    '-x',
    '-H',
    `${LDAP_SCHEME}://${host}:${LDAP_PORT}`,
    '-D',
    bindUser,
    '-y',
    passwordFile,
  ]

  if (LDAP_STARTTLS) args.push('-ZZ')
  args.push(...searchArgs)

  return new Promise((resolve, reject) => {
    const child = spawn('ldapsearch', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    })

    let stdout = ''
    let stderr = ''
    let outputTooLarge = false
    let settled = false

    const timeout = setTimeout(() => {
      if (settled) return
      child.kill('SIGKILL')
      settled = true
      reject(new LdapError('LDAP request timed out.', { stderr, timedOut: true }))
    }, LDAP_TIMEOUT_MS)

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')

    child.stdout.on('data', (chunk) => {
      if (stdout.length + chunk.length > MAX_LDAP_OUTPUT_BYTES) {
        outputTooLarge = true
        child.kill('SIGKILL')
        return
      }
      stdout += chunk
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })

    child.on('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      reject(new LdapError(error.message, { stderr }))
    })

    child.on('close', (exitCode) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)

      if (outputTooLarge) {
        reject(new LdapError('LDAP response exceeded the local size limit.', { exitCode, stderr }))
      } else if (exitCode === 0) {
        resolve(stdout)
      } else {
        reject(new LdapError('ldapsearch failed.', { exitCode, stderr }))
      }
    })
  })
}

function parseLdif(input) {
  const physicalLines = input.split(/\r?\n/)
  const lines = []

  for (const line of physicalLines) {
    if (line.startsWith(' ') && lines.length > 0) lines[lines.length - 1] += line.slice(1)
    else lines.push(line)
  }

  const entries = []
  let current = Object.create(null)

  const saveEntry = () => {
    if (Object.keys(current).length > 0) entries.push(current)
    current = Object.create(null)
  }

  for (const line of lines) {
    if (line === '') {
      saveEntry()
      continue
    }
    if (line.startsWith('#')) continue

    const match = line.match(/^([^:]+)(::?)\s?(.*)$/)
    if (!match) continue
    const [, rawName, separator, rawValue] = match
    const name = rawName.toLowerCase()
    const value = separator === '::'
      ? Buffer.from(rawValue, 'base64').toString('utf8')
      : rawValue
    if (!current[name]) current[name] = []
    current[name].push(value)
  }

  saveEntry()
  return entries
}

function toProfile(entry) {
  const values = (key) => entry[key.toLowerCase()] ?? []
  const first = (key) => values(key)[0] || null
  const userAccountControl = parseUserAccountControl(first('userAccountControl'))
  const address = [first('streetAddress'), first('l'), first('st'), first('postalCode')].filter(Boolean).join(', ') || null

  return {
    identity: {
      displayName: first('displayName'),
      givenName: first('givenName'),
      surname: first('sn'),
      commonName: first('cn'),
      username: first('sAMAccountName'),
      userPrincipalName: first('userPrincipalName'),
      employeeId: first('employeeID'),
      employeeNumber: first('employeeNumber'),
      distinguishedName: first('dn'),
    },
    organization: {
      title: first('title'),
      department: first('department'),
      company: first('company'),
      manager: commonNameFromDn(first('manager')),
      office: first('physicalDeliveryOfficeName'),
    },
    contact: {
      email: first('mail'),
      phone: first('telephoneNumber'),
      mobile: first('mobile'),
      address,
    },
    account: {
      status: userAccountControl.status,
      controlCode: userAccountControl.code,
      flags: userAccountControl.flags,
      accountExpires: formatAdTimestamp(first('accountExpires')),
      passwordLastSet: formatAdTimestamp(first('pwdLastSet')),
      lastLogon: formatAdTimestamp(first('lastLogonTimestamp')),
      createdAt: formatGeneralizedTime(first('whenCreated')),
      changedAt: formatGeneralizedTime(first('whenChanged')),
    },
    groups: values('memberOf').map(commonNameFromDn).filter(Boolean).sort((left, right) => left.localeCompare(right)),
  }
}

function parseUserAccountControl(rawValue) {
  if (!rawValue || !/^\d+$/.test(rawValue)) return { code: null, status: null, flags: [] }
  const code = Number(rawValue)
  const flags = []

  if (code & 32) flags.push('Password not required')
  if (code & 64) flags.push('Password cannot change')
  if (code & 512) flags.push('Normal account')
  if (code & 65_536) flags.push('Password never expires')
  if (code & 262_144) flags.push('Smart card required')
  if (code & 524_288) flags.push('Trusted for delegation')
  if (code & 8_388_608) flags.push('Password expired')

  return {
    code,
    status: code & 2 ? 'Disabled' : 'Enabled',
    flags,
  }
}

function formatAdTimestamp(rawValue) {
  if (!rawValue) return null
  if (rawValue === '0' || rawValue === '9223372036854775807') return 'Never'

  try {
    const unixSeconds = BigInt(rawValue) / 10_000_000n - 11_644_473_600n
    if (unixSeconds <= 0n) return rawValue
    return new Date(Number(unixSeconds) * 1000).toISOString()
  } catch {
    return rawValue
  }
}

function formatGeneralizedTime(rawValue) {
  if (!rawValue) return null
  const match = rawValue.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\.\d+)?Z$/)
  if (!match) return rawValue
  const [, year, month, day, hour, minute, second] = match
  return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
}

function commonNameFromDn(dn) {
  if (!dn) return null
  const match = dn.match(/^CN=((?:\\.|[^,])+),/i)
  if (!match) return dn
  return match[1]
    .replace(/\\([,=+<>#;"\\])/g, '$1')
    .replace(/\\([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
}

function getBindCandidates(username) {
  if (username.includes('\\') || username.includes('@')) return [username]
  return [...new Set([
    username,
    `${LDAP_DEFAULT_DOMAIN_NETBIOS}\\${username}`,
    `${username}@${LDAP_DEFAULT_UPN_SUFFIX}`,
  ])]
}

function normalizeAccountName(username) {
  return username.replace(/^.*\\/, '').replace(/@.*$/, '')
}

function escapeLdapFilter(value) {
  return value
    .replace(/\\/g, '\\5c')
    .replace(/\*/g, '\\2a')
    .replace(/\(/g, '\\28')
    .replace(/\)/g, '\\29')
    .replace(/\0/g, '\\00')
}

function firstValue(entry, key) {
  return entry?.[key.toLowerCase()]?.[0] ?? ''
}

function friendlyLdapError(error, fallback) {
  const details = error instanceof LdapError ? error.stderr : ''
  if (/invalid credentials|data\s+52e/i.test(details)) return 'LDAP rejected the credentials.'
  if (/can.t contact ldap server|connection refused|network is unreachable/i.test(details)) return 'The LDAP server could not be reached. Check VPN connectivity.'
  if (/confidentiality required|strong.*auth.*required/i.test(details)) return 'The LDAP server requires an encrypted connection. Enable StartTLS or LDAPS.'
  if (error instanceof LdapError && error.timedOut) return 'The LDAP request timed out. Check VPN connectivity.'
  return fallback
}

function validateCredentialField(value, label, maxLength, trim = true) {
  if (typeof value !== 'string') throw new HttpError(400, `${label} is required.`)
  const normalized = trim ? value.trim() : value
  if (!normalized) throw new HttpError(400, `${label} is required.`)
  if (normalized.length > maxLength || normalized.includes('\0')) throw new HttpError(400, `${label} is invalid.`)
  return normalized
}

function requireJsonContentType(request) {
  const contentType = request.headers['content-type'] ?? ''
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'Content-Type must be application/json.')
  }
}

function requireLocalOrigin(request) {
  const origin = request.headers.origin
  if (!origin) return

  try {
    const parsed = new URL(origin)
    const localHost = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost' || parsed.hostname === '[::1]'
    if (!localHost || Number(parsed.port || 80) !== PORT) throw new Error('Origin rejected')
  } catch {
    throw new HttpError(403, 'Cross-origin requests are not allowed.')
  }
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''

    request.setEncoding('utf8')
    request.on('data', (chunk) => {
      body += chunk
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        reject(new HttpError(413, 'Request body is too large.'))
        request.destroy()
      }
    })
    request.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'))
      } catch {
        reject(new HttpError(400, 'Request body must be valid JSON.'))
      }
    })
    request.on('error', reject)
  })
}

function setSecurityHeaders(response) {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'")
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  response.setHeader('Referrer-Policy', 'no-referrer')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload)
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  })
  response.end(body)
}

function parsePort(rawValue, fallback) {
  const parsed = Number(rawValue)
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65_535 ? parsed : fallback
}

function parsePositiveInteger(rawValue, fallback) {
  const parsed = Number(rawValue)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}
