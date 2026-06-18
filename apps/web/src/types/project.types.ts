export type ProjectStatus = 'active' | 'paused' | 'completed' | 'risk'
export type TaskPriority = 'high' | 'medium' | 'low'
export type TaskStatus = 'done' | 'inprogress' | 'pending'
export type FilterType = 'all' | 'pending' | 'inprogress' | 'done'

export interface Project {
  id: string
  name: string
  color: string
  icon: string
  status: ProjectStatus
  pct: number
  total: number
  done: number
  overdue: number
  desc: string
}

export interface Subtask {
  text: string
  done: boolean
}

export interface Attachment {
  name: string
  size: string
  url: string
  driveFileId?: string
  driveFolderId?: string
  mimeType?: string
  sizeBytes?: number
  webViewLink?: string
  uploadedAt?: string
  uploadedBy?: string
}

export interface Task {
  id: string
  proj: string
  name: string
  priority: TaskPriority
  status: TaskStatus
  tag: string
  tagColor: string
  date: string
  assignees: string[]
  desc: string
  subtasks: Subtask[]
  attachments: Attachment[]
  activity: string[]
}

export type NewTaskInput = Pick<Task, 'name' | 'proj' | 'priority' | 'date' | 'assignees'> & {
  tag?: string
}

export type CrmProjectStatus = 'prospecto' | 'en_progreso' | 'pausado' | 'cerrado' | 'perdido'
export type CrmTaskStatus = 'pendiente' | 'en_progreso' | 'completada' | 'bloqueada'

export type CrmClientRef = {
  _id: string
  name: string
  taxId?: string
  email?: string
}

export type CrmProjectTask = {
  _id?: string
  title: string
  owner?: string
  dueDate?: string
  status: CrmTaskStatus
  notes?: string
  priority?: TaskPriority
  tag?: string
  tagColor?: string
  assignees?: string[]
  desc?: string
  subtasks?: Subtask[]
  attachments?: Attachment[]
  activity?: string[]
}

export type CrmProjectValue = {
  label: string
  amount: number
  currency: string
  type: 'ingreso' | 'egreso'
  dueDate?: string
  status: 'pendiente' | 'facturado' | 'pagado'
  notes?: string
}

export type CrmProjectRecord = {
  _id: string
  clientId: string | CrmClientRef
  name: string
  serviceType?: string
  status: CrmProjectStatus
  startDate?: string
  endDate?: string
  description?: string
  driveFolderId?: string
  values: CrmProjectValue[]
  tasks: CrmProjectTask[]
  updatedAt?: string
}
