'use client'

import { useAuth } from '@clerk/nextjs'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Download, Eye, Loader2, Paperclip, Plus, UploadCloud, X } from 'lucide-react'
import { DragEvent, useEffect, useMemo, useState } from 'react'
import { useProjectStore } from '@/store/projectStore'
import type { Attachment, Task } from '@/types/project.types'

type DetailPanelProps = {
  task: Task
  onClose: () => void
  onToast: (message: string) => void
  onSave: (task: Task, previousProjectId: string, message: string) => Promise<void>
}

export default function DetailPanel({ task, onClose, onToast, onSave }: DetailPanelProps) {
  const { getToken } = useAuth()
  const projects = useProjectStore((state) => state.projects)
  const updateTask = useProjectStore((state) => state.updateTask)
  const [draft, setDraft] = useState(task)
  const [newSubtask, setNewSubtask] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [busyAttachment, setBusyAttachment] = useState<string | null>(null)

  useEffect(() => {
    setDraft(task)
  }, [task])

  const projectName = useMemo(
    () => projects.find((project) => project.id === draft.proj)?.name || 'Proyecto',
    [draft.proj, projects]
  )

  const addSubtaskToDraft = () => {
    const text = newSubtask.trim()
    if (!text) return
    setDraft({ ...draft, subtasks: [...draft.subtasks, { text, done: false }] })
    setNewSubtask('')
  }

  const getAuthHeader = async () => {
    const token = await getToken()
    if (!token) throw new Error('No autorizado')
    return { 'X-Clerk-Session-Token': token }
  }

  const addAttachments = async (files: FileList | null) => {
    if (!files?.length) return
    if (draft.id.startsWith('task-')) {
      onToast('Guarda la tarea en MongoDB antes de adjuntar archivos.')
      return
    }

    setIsUploading(true)
    setUploadProgress(8)

    try {
      const uploadedAttachments: Attachment[] = []
      const selectedFiles = Array.from(files)

      for (const [index, file] of selectedFiles.entries()) {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(`/api/crm/admin/projects/${draft.proj}/tasks/${draft.id}/attachments`, {
          method: 'POST',
          headers: await getAuthHeader(),
          body: formData,
        })
        const data = await response.json().catch(() => null)
        if (!response.ok) throw new Error(data?.error?.message || `No pudimos subir ${file.name}`)

        uploadedAttachments.push(data.attachment)
        setUploadProgress(Math.round(((index + 1) / selectedFiles.length) * 100))
      }

      setDraft((currentDraft) => {
        const nextDraft = {
          ...currentDraft,
          attachments: [...currentDraft.attachments, ...uploadedAttachments],
          activity: [...currentDraft.activity, ...uploadedAttachments.map((attachment) => `Adjunto cargado: ${attachment.name}`)],
        }
        updateTask(currentDraft.id, {
          attachments: nextDraft.attachments,
          activity: nextDraft.activity,
        }, 'Adjuntos sincronizados en Google Drive')
        return nextDraft
      })
      onToast('Archivo cargado en Google Drive y registrado en MongoDB')
      window.setTimeout(() => setUploadProgress(0), 700)
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No pudimos subir el archivo')
      setUploadProgress(0)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    addAttachments(event.dataTransfer.files)
  }

  const fetchAttachmentBlob = async (attachment: Attachment, download = false) => {
    if (!attachment.url || attachment.url === '#') throw new Error('Adjunto sin URL de descarga')
    const separator = attachment.url.includes('?') ? '&' : '?'
    const response = await fetch(`${attachment.url}${download ? `${separator}download=1` : ''}`, {
      headers: await getAuthHeader(),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => null)
      throw new Error(data?.error?.message || 'No pudimos obtener el adjunto')
    }
    return response.blob()
  }

  const viewAttachment = async (attachment: Attachment) => {
    setBusyAttachment(attachment.driveFileId || attachment.name)
    try {
      const blob = await fetchAttachmentBlob(attachment)
      const objectUrl = window.URL.createObjectURL(blob)
      window.open(objectUrl, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000)
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No pudimos abrir el adjunto')
    } finally {
      setBusyAttachment(null)
    }
  }

  const downloadAttachment = async (attachment: Attachment) => {
    setBusyAttachment(attachment.driveFileId || attachment.name)
    try {
      const blob = await fetchAttachmentBlob(attachment, true)
      const objectUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = attachment.name
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(objectUrl)
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No pudimos descargar el adjunto')
    } finally {
      setBusyAttachment(null)
    }
  }

  const save = async () => {
    const previousProjectId = task.proj
    updateTask(task.id, draft, `Cambios guardados el ${format(new Date(), 'd MMM HH:mm', { locale: es })}`)
    try {
      await onSave(draft, previousProjectId, 'Tarea actualizada')
      onClose()
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No pudimos guardar cambios')
    }
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl">
      <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Detalle de tarea</p>
          <input
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            className="mt-1 w-full rounded-md border-0 bg-transparent p-0 text-xl font-black text-slate-950 outline-none"
          />
        </div>
        <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Cerrar detalle">
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <textarea
          value={draft.desc}
          onChange={(event) => setDraft({ ...draft, desc: event.target.value })}
          rows={4}
          placeholder="Descripción de la tarea"
          className="w-full resize-none rounded-[10px] border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <label className="text-xs font-bold uppercase text-slate-500">
            Prioridad
            <select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Task['priority'] })} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-2 text-sm normal-case text-slate-800">
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </label>
          <label className="text-xs font-bold uppercase text-slate-500">
            Fecha
            <input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-2 text-sm normal-case text-slate-800" />
          </label>
          <label className="text-xs font-bold uppercase text-slate-500">
            Proyecto
            <select value={draft.proj} onChange={(event) => setDraft({ ...draft, proj: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-2 text-sm normal-case text-slate-800">
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
        </div>

        <section className="mt-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-950">Subtareas</h3>
            <span className="text-xs font-bold text-slate-400">{draft.subtasks.filter((subtask) => subtask.done).length}/{draft.subtasks.length}</span>
          </div>
          <div className="mt-2 grid gap-2">
            {draft.subtasks.map((subtask, index) => (
              <label key={`${subtask.text}-${index}`} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={subtask.done}
                  onChange={() => setDraft({
                    ...draft,
                    subtasks: draft.subtasks.map((current, currentIndex) => currentIndex === index ? { ...current, done: !current.done } : current),
                  })}
                />
                <span className={subtask.done ? 'text-slate-400 line-through' : ''}>{subtask.text}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input value={newSubtask} onChange={(event) => setNewSubtask(event.target.value)} placeholder="Agregar subtarea" className="h-10 flex-1 rounded-md border border-slate-200 px-3 text-sm" />
            <button type="button" onClick={addSubtaskToDraft} className="flex h-10 items-center gap-1 rounded-md bg-blue-700 px-3 text-sm font-bold text-white hover:bg-blue-800">
              <Plus className="h-4 w-4" />
              Agregar
            </button>
          </div>
        </section>

        <section className="mt-5">
          <h3 className="text-sm font-black text-slate-950">Adjuntos</h3>
          <div className="mt-2 grid gap-2">
            {draft.attachments.map((attachment) => (
              <div key={`${attachment.driveFileId || attachment.url}-${attachment.name}`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">{attachment.name}</span>
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="mr-1 text-xs text-slate-400">{attachment.size}</span>
                  <button
                    type="button"
                    onClick={() => viewAttachment(attachment)}
                    disabled={!attachment.driveFileId || busyAttachment === (attachment.driveFileId || attachment.name)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Ver ${attachment.name}`}
                  >
                    {busyAttachment === (attachment.driveFileId || attachment.name) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadAttachment(attachment)}
                    disabled={!attachment.driveFileId || busyAttachment === (attachment.driveFileId || attachment.name)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Descargar ${attachment.name}`}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <label
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-[10px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500 hover:border-blue-400 hover:bg-blue-50"
          >
            <UploadCloud className="mb-2 h-6 w-6 text-blue-600" />
            {isUploading ? 'Subiendo a Google Drive...' : 'Arrastra archivos o haz click para cargar en Google Drive'}
            <input type="file" multiple className="hidden" disabled={isUploading} onChange={(event) => addAttachments(event.target.files)} />
          </label>
          {uploadProgress > 0 && (
            <div className="mt-3 h-2 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
        </section>

        <section className="mt-5">
          <h3 className="text-sm font-black text-slate-950">Actividad</h3>
          <div className="mt-2 grid gap-2">
            {[...draft.activity].reverse().map((item, index) => (
              <div key={`${item}-${index}`} className="rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-600">
                {item}
              </div>
            ))}
            <div className="rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-600">
              Programada para {format(parseISO(draft.date), 'd MMM yyyy', { locale: es })} en {projectName}
            </div>
          </div>
        </section>
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
        <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancelar</button>
        <button type="button" onClick={save} className="h-10 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800">Guardar cambios</button>
      </footer>
    </aside>
  )
}
