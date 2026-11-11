import { PrismaClient } from '@prisma/client'

const databaseUrl = process.env.TEST_DATABASE_URL
if (!databaseUrl || !new URL(databaseUrl).pathname.includes('_test')) {
  throw new Error('TEST_DATABASE_URL must name an isolated _test database')
}
const prisma = new PrismaClient({ datasourceUrl: databaseUrl })
try {
  for (const [id, name, role] of [
    ['preview-hr', 'Serenay', 'human_resource'],
    ['preview-manager', 'Ayca', 'hiring_manager'],
  ] as const) {
    await prisma.user.upsert({ where: { id }, update: {}, create: { id, oidcSubject: id, email: `${id}@example.test`, name, role } })
  }
  await prisma.project.upsert({
    where: { id: 'preview-project' }, update: {},
    create: { id: 'preview-project', name: 'Refactor Verification', position: 'Software Engineer', members: { create: [
      { userId: 'preview-hr', projectRole: 'human_resource' },
      { userId: 'preview-manager', projectRole: 'hiring_manager' },
    ] } },
  })
  for (const [id, fullName] of [['preview-sam', 'Sam Taylor'], ['preview-chris', 'Chris Brown']]) {
    await prisma.candidate.upsert({ where: { id }, update: {}, create: { id, fullName, source: 'manual' } })
    await prisma.candidateApplication.upsert({
      where: { id: `${id}-application` }, update: {},
      create: { id: `${id}-application`, candidateId: id, projectId: 'preview-project', stage: 'pre_interview', status: 'waiting_for_contact' },
    })
  }
  console.log('Isolated preview fixtures are ready')
} finally {
  await prisma.$disconnect()
}
