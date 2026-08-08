import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearDatabase() {
  await prisma.activityEvent.deleteMany()
  await prisma.offer.deleteMany()
  await prisma.projectOfferQueueItem.deleteMany()
  await prisma.contactAttempt.deleteMany()
  await prisma.rejectionFollowUp.deleteMany()
  await prisma.interview.deleteMany()
  await prisma.candidateNote.deleteMany()
  await prisma.projectStageComment.deleteMany()
  await prisma.file.deleteMany()
  await prisma.externalReference.deleteMany()
  await prisma.candidateApplication.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.candidate.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()
}

async function main() {
  await clearDatabase()

  const [humanResourceUser, hiringManager] = await Promise.all([
    prisma.user.create({
      data: {
        id: 'u-sarah',
        oidcSubject: 'seed-oidc-sarah',
        email: 'sarah.chen@example.com',
        name: 'Sarah Chen',
        role: 'human_resource',
      },
    }),
    prisma.user.create({
      data: {
        id: 'u-maya',
        oidcSubject: 'seed-oidc-maya',
        email: 'maya.patel@example.com',
        name: 'Maya Patel',
        role: 'hiring_manager',
      },
    }),
    prisma.user.create({
      data: {
        id: 'u-tony',
        oidcSubject: 'seed-oidc-tony',
        email: 'tony.stark@example.com',
        name: 'Tony Stark',
        role: 'hiring_manager',
      },
    }),
    prisma.user.create({
      data: {
        id: 'u-pepper',
        oidcSubject: 'seed-oidc-pepper',
        email: 'pepper.potts@example.com',
        name: 'Pepper Potts',
        role: 'human_resource',
      },
    }),
    prisma.user.create({
      data: {
        id: 'u-natasha',
        oidcSubject: 'seed-oidc-natasha',
        email: 'natasha.romanoff@example.com',
        name: 'Natasha Romanoff',
        role: 'admin',
      },
    }),
  ])

  const project = await prisma.project.create({
    data: {
      id: 'p-designer',
      name: 'Senior Product Designer Hiring',
      position: 'Senior Product Designer',
      status: 'active',
      notes: 'Initial seed project based on the reference UI.',
      createdByUserId: humanResourceUser.id,
      members: {
        create: [
          { userId: humanResourceUser.id, projectRole: 'human_resource' },
          { userId: hiringManager.id, projectRole: 'hiring_manager' },
        ],
      },
      externalReferences: {
        create: {
          resourceType: 'project',
          provider: 'linkedin',
          externalId: 'LI-2026-0042',
        },
      },
      stageComments: {
        create: [
          {
            stage: 'pre_interview',
            authorUserId: hiringManager.id,
            authorRole: 'hiring_manager',
            body: 'Confirm product-design depth, portfolio ownership, and why the candidate is interested in this role.',
          },
          {
            stage: 'pre_interview',
            authorUserId: humanResourceUser.id,
            authorRole: 'human_resource',
            body: 'Check compensation expectations, notice period, and remote-work flexibility in the first screening call.',
          },
        ],
      },
    },
  })

  const [sara, li] = await Promise.all([
    prisma.candidate.create({
      data: {
        id: 'c-sara',
        fullName: 'Sara K',
        source: 'linkedin',
        email: 'sara.k@example.com',
        phone: '+971 50 123 4567',
      },
    }),
    prisma.candidate.create({
      data: {
        id: 'c-li',
        fullName: 'Li A.',
        source: 'linkedin',
        email: 'li.a@example.com',
        phone: '+971 50 987 6543',
      },
    }),
  ])

  const [saraApplication, liApplication] = await Promise.all([
    prisma.candidateApplication.create({
      data: {
        id: 'ca-sara',
        projectId: project.id,
        candidateId: sara.id,
        stage: 'department_interview',
        status: 'waiting_for_contact',
        appliedLabel: 'Applied 2d ago',
      },
    }),
    prisma.candidateApplication.create({
      data: {
        id: 'ca-li',
        projectId: project.id,
        candidateId: li.id,
        stage: 'department_interview',
        status: 'scheduled',
        appliedLabel: 'Applied 1w ago',
      },
    }),
  ])

  await prisma.interview.create({
    data: {
      candidateApplicationId: liApplication.id,
      projectId: project.id,
      type: 'department_interview',
      status: 'scheduled',
      scheduledStartAt: new Date('2026-04-12T10:00:00.000Z'),
      scheduledEndAt: new Date('2026-04-12T11:00:00.000Z'),
      timezone: 'GST',
      meetingUrl: 'https://meet.example.com/li-a',
      createdByUserId: humanResourceUser.id,
    },
  })

  await prisma.contactAttempt.create({
    data: {
      candidateApplicationId: liApplication.id,
      context: 'department_interview',
      result: 'scheduled',
      attemptedAt: new Date('2026-04-09T09:00:00.000Z'),
      notes: 'Department interview scheduled.',
      createdByUserId: humanResourceUser.id,
    },
  })

  await prisma.candidateNote.create({
    data: {
      candidateApplicationId: saraApplication.id,
      authorUserId: humanResourceUser.id,
      authorRole: 'human_resource',
      visibility: 'all',
      fields: [
        {
          question: 'Why is the candidate interested in this role?',
          answer: 'Candidate is interested in product ownership and a stronger design team environment.',
          visibility: 'all',
        },
        {
          question: 'What is the expected wage?',
          answer: 'Expected wage is aligned with the initial range discussed in screening.',
          visibility: 'human_resource_only',
        },
      ],
    },
  })

  await prisma.activityEvent.createMany({
    data: [
      {
        candidateApplicationId: saraApplication.id,
        projectId: project.id,
        eventType: 'profile_imported',
        title: 'Profile Imported',
        subtitle: 'Source: LinkedIn Recruiter',
      },
      {
        candidateApplicationId: liApplication.id,
        projectId: project.id,
        eventType: 'profile_imported',
        title: 'Profile Imported',
        subtitle: 'Source: LinkedIn Recruiter',
      },
      {
        candidateApplicationId: liApplication.id,
        projectId: project.id,
        eventType: 'department_interview_scheduled',
        title: 'Department Interview Scheduled',
        subtitle: 'Scheduled by Human Resource - Sarah Chen',
        actorUserId: humanResourceUser.id,
        actorRole: 'human_resource',
      },
    ],
  })

  console.log('Seeded database')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
