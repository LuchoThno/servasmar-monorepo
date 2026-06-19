import type { HydratedDocument } from 'mongoose'
import { ensureDriveFolder } from '@/lib/googleDrive'

type ClientLike = HydratedDocument<any>
type ProjectLike = HydratedDocument<any>

const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ').slice(0, 120)

export const clientFolderName = (clientName: string, clientId: string) => `${normalizeName(clientName)} - ${clientId.slice(-8)}`
export const projectFolderName = (projectName: string, projectId: string) => `${normalizeName(projectName)} - ${projectId.slice(-8)}`

export const ensureDriveBaseFolders = async () => {
  const clientsRootId = await ensureDriveFolder('CLIENTES')
  return { clientsRootId }
}

export const ensureClientDriveFolder = async (client: ClientLike) => {
  if (client.driveFolderId) return client.driveFolderId as string

  const { clientsRootId } = await ensureDriveBaseFolders()
  const folderId = await ensureDriveFolder(clientFolderName(client.name, String(client._id)), clientsRootId)
  client.driveFolderId = folderId
  await client.save()
  return folderId
}

export const ensureProjectDriveFolder = async (client: ClientLike, project: ProjectLike) => {
  if (project.driveFolderId) return project.driveFolderId as string

  const clientFolderId = await ensureClientDriveFolder(client)
  const projectsRootId = await ensureDriveFolder('PROYECTOS', clientFolderId)
  const folderId = await ensureDriveFolder(projectFolderName(project.name, String(project._id)), projectsRootId)
  project.driveFolderId = folderId
  await project.save()
  return folderId
}

export const ensureClientCategoryFolder = async (client: ClientLike, category: string) => {
  const clientFolderId = await ensureClientDriveFolder(client)
  return ensureDriveFolder(category, clientFolderId)
}

export const ensureProjectCategoryFolder = async (client: ClientLike, project: ProjectLike, category: string) => {
  const projectFolderId = await ensureProjectDriveFolder(client, project)
  return ensureDriveFolder(category, projectFolderId)
}
