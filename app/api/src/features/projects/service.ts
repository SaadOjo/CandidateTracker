import type { CandidateStage, PrismaClient, ProjectMemberRole } from '@prisma/client'
import { ApiError } from '../../errors.js'

export function createProjectService(prisma: PrismaClient) {
  async function saveStageComment(projectId: string, stage: CandidateStage, authorUserId: string, authorRole: ProjectMemberRole, body: string) {
    if (stage === 'pre_interview' && authorRole !== 'hiring_manager') {
      throw new ApiError(403, 'Only Hiring Managers can edit pre-interview comments')
    }
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM projects WHERE id = ${projectId} FOR UPDATE`
      const project = await tx.project.findUnique({ where: { id: projectId }, select: { id: true } })
      if (!project) throw new ApiError(404, 'Project not found')
      const comments = await tx.projectStageComment.findMany({
        where: { projectId, stage, authorUserId, authorRole },
        select: { id: true }, take: 2,
      })
      if (comments.length > 1) throw new ApiError(409, 'Duplicate stage comments require review before editing')
      if (comments[0]) {
        return tx.projectStageComment.update({ where: { id: comments[0].id }, data: { body } })
      }
      return tx.projectStageComment.create({ data: { projectId, stage, authorUserId, authorRole, body } })
    })
  }

  async function requireProject(projectId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } })
    if (!project) throw new ApiError(404, 'Project not found')
  }

  async function validateProjectAssignment(hiringManagerUserIds: string[], assignedHumanResourceUserIds: string[]) {
    const normalizedHiringManagerUserIds = uniqueIds(hiringManagerUserIds)
    const normalizedAssignedHumanResourceUserIds = uniqueIds(assignedHumanResourceUserIds)
    const requestedUserIds = uniqueIds([...normalizedHiringManagerUserIds, ...normalizedAssignedHumanResourceUserIds])

    const users = await prisma.user.findMany({
      where: { id: { in: requestedUserIds }, active: true },
      select: { id: true, role: true },
    })
    const usersById = new Map(users.map((user) => [user.id, user]))

    const missingUserIds = requestedUserIds.filter((userId) => !usersById.has(userId))
    if (missingUserIds.length > 0) {
      throw new ApiError(400, `Unknown or inactive users: ${missingUserIds.join(', ')}`)
    }

    const invalidHiringManagers = normalizedHiringManagerUserIds.filter(
      (userId) => usersById.get(userId)?.role !== 'hiring_manager',
    )
    if (invalidHiringManagers.length > 0) {
      throw new ApiError(400, `Users are not hiring managers: ${invalidHiringManagers.join(', ')}`)
    }

    const invalidHumanResourceUsers = normalizedAssignedHumanResourceUserIds.filter((userId) => usersById.get(userId)?.role !== 'human_resource')
    if (invalidHumanResourceUsers.length > 0) {
      throw new ApiError(400, `Users are not Human Resource users: ${invalidHumanResourceUsers.join(', ')}`)
    }

    return {
      hiringManagerUserIds: normalizedHiringManagerUserIds,
      assignedHumanResourceUserIds: normalizedAssignedHumanResourceUserIds,
    }
  }

  function uniqueIds(ids: string[]) {
    return [...new Set(ids)]
  }

  return { requireProject, validateProjectAssignment, saveStageComment }
}
