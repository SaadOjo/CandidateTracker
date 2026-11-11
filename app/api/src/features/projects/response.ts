import { Prisma } from '@prisma/client'
import { simulatorProvider, TrackingMetadataSchema } from '../simulator-import/contract.js'

export const projectResponseInclude = Prisma.validator<Prisma.ProjectInclude>()({
  _count: { select: { applications: true } },
  externalReferences: true,
  members: { include: { user: { select: { id: true, name: true } } } },
  stageComments: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'asc' } },
  offers: {
    where: { status: 'offer_accepted' },
    select: { id: true },
    take: 1,
  },
})

export type ProjectWithResponse = Prisma.ProjectGetPayload<{ include: typeof projectResponseInclude }>

export function toProjectResponse(project: ProjectWithResponse) {
  const hiringManagerMembers = project.members.filter((member) => member.projectRole === 'hiring_manager')
  const assignedHumanResourcesMembers = project.members.filter((member) => member.projectRole === 'human_resource')
  const linkedinReference = project.externalReferences.find(
    (reference) => reference.provider === 'linkedin' && reference.resourceType === 'project',
  )
  const simulatorReference = project.externalReferences.find((reference) => reference.provider === simulatorProvider && reference.resourceType === 'project')

  return {
    id: project.id,
    name: project.name,
    position: project.position,
    status: project.status,
    notes: project.notes,
    createdAt: project.createdAt,
    archivedAt: project.archivedAt,
    stageComments: project.stageComments.filter((comment) => comment.stage !== 'pre_interview' || comment.authorRole === 'hiring_manager'),
    candidateCount: project._count.applications,
    hasAcceptedOffer: project.offers.length > 0,
    hiringManager: hiringManagerMembers.map((member) => member.user.name).join(', '),
    hiringManagerUserIds: hiringManagerMembers.map((member) => member.userId),
    assignedHumanResources: assignedHumanResourcesMembers.map((member) => member.user.name),
    assignedHumanResourceUserIds: assignedHumanResourcesMembers.map((member) => member.userId),
    linkedinProjectId: linkedinReference?.externalId,
    importMode: getImportMode(linkedinReference?.metadata),
    simulatorTracking: simulatorReference ? TrackingMetadataSchema.parse(simulatorReference.metadata) : null,
  }
}

function getImportMode(metadata: Prisma.JsonValue | undefined) {
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) return 'auto_sync'
  const value = (metadata as { importMode?: unknown }).importMode
  return value === 'manual_import' ? 'manual_import' : 'auto_sync'
}
