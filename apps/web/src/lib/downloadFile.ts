export async function downloadFileResponse(response: Response, fallbackName: string) {
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `No pudimos descargar el archivo (${response.status})`)
  }

  const blob = await response.blob()
  const contentDisposition = response.headers.get('content-disposition') || ''
  const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i)
  const filename = decodeURIComponent((filenameMatch?.[1] || fallbackName).replace(/"/g, '').trim())
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename || fallbackName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(url)
}
