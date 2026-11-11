export const apiVersion = '202604'
export const integrationContext = 'urn:li:organization:900000001'
export const pipelineStages = ['uncontacted', 'contacted', 'replied', 'shortlisted']
export const project = {
  id: 'sim-project-001',
  name: 'Software Engineer',
  position: 'Software Engineer',
  company: 'Example Labs',
  location: 'Istanbul, Turkey',
  referenceEntityType: 'REQUISITION',
  referenceEntityId: 'req-demo-001',
  owner: 'Alex Morgan',
}

const people = [
  ['Sam', 'Taylor', 'Software Engineer', 'Example Systems', 'Istanbul', 'TR'],
  ['Emma', 'Reed', 'Frontend Engineer', 'Example Studio', 'London', 'GB'],
  ['Leo', 'Martin', 'Backend Engineer', 'Example Cloud', 'Berlin', 'DE'],
  ['Mia', 'Clark', 'Full Stack Engineer', 'Example Works', 'Istanbul', 'TR'],
  ['Noah', 'Brooks', 'Software Engineer', 'Example Systems', 'Amsterdam', 'NL'],
  ['Ava', 'Green', 'Platform Engineer', 'Example Cloud', 'Ankara', 'TR'],
  ['Ben', 'Carter', 'Frontend Engineer', 'Example Studio', 'Dublin', 'IE'],
  ['Lily', 'Scott', 'Backend Engineer', 'Example Works', 'Izmir', 'TR'],
  ['Max', 'Turner', 'Full Stack Engineer', 'Example Systems', 'Paris', 'FR'],
  ['Ella', 'Parker', 'Software Engineer', 'Example Cloud', 'Stockholm', 'SE'],
]

function demoContact(firstName, lastName, identity) {
  return {
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    // NANP 555-0100 through 555-0199 is reserved for fictional numbers.
    phone: `+120255501${String(identity).padStart(2, '0')}`,
  }
}

export const candidates = people.map(([firstName, lastName, role, company, city, countryCode], index) => ({
  id: `sim-candidate-${String(index + 1).padStart(2, '0')}`,
  firstName,
  lastName,
  headline: `${role} at ${company}`,
  currentEmployerNames: [company],
  location: { locationName: city, countryCode },
  member: `urn:li:person:sim${String(index + 1).padStart(3, '0')}`,
  // Reserved .invalid domain prevents fictional profiles from linking to real people.
  profileUrl: `https://linkedin.invalid/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
  ...demoContact(firstName, lastName, index + 1),
}))

function additionalProject(number, position, names, company) {
  const suffix = String(number).padStart(3, '0')
  return {
    project: { ...project, id: `sim-project-${suffix}`, name: position, position, company, referenceEntityId: `req-demo-${suffix}` },
    candidates: names.map(([firstName, lastName], index) => {
      const identity = (number - 1) * 10 + index + 1
      return {
        id: `sim-candidate-${String(identity).padStart(2, '0')}`, firstName, lastName,
        headline: `${position} at ${company}`, currentEmployerNames: [company],
        location: { locationName: 'Istanbul', countryCode: 'TR' },
        member: `urn:li:person:sim${String(identity).padStart(3, '0')}`,
        profileUrl: `https://linkedin.invalid/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
        ...demoContact(firstName, lastName, identity),
      }
    }),
  }
}

export const demoProjects = [
  { project, candidates },
  additionalProject(2, 'Product Designer', [
    ['Amy', 'Stone'], ['Jack', 'Hill'], ['Zoe', 'Lane'], ['Luke', 'West'], ['Eva', 'Bell'],
    ['Tom', 'Wood'], ['Nina', 'Lake'], ['Owen', 'Page'], ['Ruby', 'Fox'], ['Adam', 'King'],
  ], 'Example Studio'),
  additionalProject(3, 'Data Analyst', [
    ['Anna', 'Cole'], ['Ryan', 'Hall'], ['Lucy', 'Ward'], ['Eric', 'Gray'], ['Rose', 'Cook'],
    ['Alex', 'Ford'], ['Kate', 'Ross'], ['Paul', 'Dean'], ['Ivy', 'Young'], ['Finn', 'Hart'],
  ], 'Example Analytics'),
]

export const requester = {
  member: 'urn:li:person:simRecruiter',
  firstName: 'Alex',
  lastName: 'Morgan',
}
