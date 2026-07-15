import PDFDocument from 'pdfkit'

type FooterMeta = {
  downloadedBy: string
  generatedAt: Date
  documentType: string
  exportId: string
  sequenceLabel: string
}

type TableColumn = {
  key: string
  label: string
  width: number
  align?: 'left' | 'right' | 'center'
}

type TableRow = Record<string, string>

const PAGE_MARGIN = 40
const FOOTER_HEIGHT = 34
const TABLE_HEADER_FILL = '#eef2f7'
const BORDER_COLOR = '#cbd5e1'
const TEXT_COLOR = '#0f172a'
const MUTED_COLOR = '#475569'

export function createAdminPdfDocument(title: string) {
  return new PDFDocument({
    size: 'LETTER',
    margins: { top: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: PAGE_MARGIN + FOOTER_HEIGHT },
    bufferPages: true,
    info: {
      Title: title,
      Author: 'SERVASMAR',
      Subject: title,
      Producer: 'SERVASMAR Admin Export',
      Creator: 'SERVASMAR',
    },
  })
}

export function pdfToBuffer(doc: PDFKit.PDFDocument, footer: FooterMeta) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    doc.on('error', reject)
    doc.on('end', () => resolve(Buffer.concat(chunks)))

    const pageRange = doc.bufferedPageRange()
    for (let pageIndex = 0; pageIndex < pageRange.count; pageIndex += 1) {
      doc.switchToPage(pageIndex)
      drawFooter(doc, footer, pageIndex + 1, pageRange.count)
    }

    doc.end()
  })
}

export function drawReportHeader(
  doc: PDFKit.PDFDocument,
  {
    title,
    subtitle,
    sequenceLabel,
    exportId,
  }: { title: string; subtitle: string; sequenceLabel: string; exportId: string }
) {
  doc.fillColor(TEXT_COLOR).font('Helvetica-Bold').fontSize(18).text('SERVASMAR', { align: 'left' })
  doc.moveDown(0.2)
  doc.fontSize(13).text(title)
  doc.moveDown(0.15)
  doc.font('Helvetica').fontSize(9.5).fillColor(MUTED_COLOR).text(subtitle)
  doc.moveDown(0.45)
  doc.font('Helvetica').fontSize(8.5).fillColor(MUTED_COLOR).text(`Correlativo: ${sequenceLabel}`)
  doc.text(`Documento: ${exportId}`)
  doc.moveDown(0.8)
  drawRule(doc)
  doc.moveDown(0.8)
}

export function drawSectionTitle(doc: PDFKit.PDFDocument, title: string, subtitle?: string) {
  ensureSpace(doc, subtitle ? 40 : 24)
  doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT_COLOR).text(title)
  if (subtitle) {
    doc.moveDown(0.15)
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED_COLOR).text(subtitle)
  }
  doc.moveDown(0.45)
}

export function drawTable(
  doc: PDFKit.PDFDocument,
  columns: TableColumn[],
  rows: TableRow[],
  emptyText = 'Sin registros disponibles.'
) {
  const tableLeft = doc.page.margins.left
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0)
  const bottomLimit = doc.page.height - doc.page.margins.bottom
  const cellPadX = 6
  const cellPadY = 6

  const drawHeader = () => {
    const headerHeight = Math.max(
      ...columns.map((column) => doc.heightOfString(column.label, { width: column.width - cellPadX * 2, align: column.align || 'left' })),
      10
    ) + cellPadY * 2

    ensureSpace(doc, headerHeight + 4)
    let currentX = tableLeft
    const topY = doc.y
    columns.forEach((column) => {
      doc.save()
      doc.rect(currentX, topY, column.width, headerHeight).fillAndStroke(TABLE_HEADER_FILL, BORDER_COLOR)
      doc.restore()
      doc.fillColor(TEXT_COLOR).font('Helvetica-Bold').fontSize(8.5)
      doc.text(column.label, currentX + cellPadX, topY + cellPadY, {
        width: column.width - cellPadX * 2,
        align: column.align || 'left',
      })
      currentX += column.width
    })
    doc.y = topY + headerHeight
    return headerHeight
  }

  const drawRow = (row: TableRow) => {
    const rowHeight = Math.max(
      ...columns.map((column) =>
        doc.heightOfString(row[column.key] || '-', {
          width: column.width - cellPadX * 2,
          align: column.align || 'left',
        })
      ),
      10
    ) + cellPadY * 2

    if (doc.y + rowHeight > bottomLimit) {
      doc.addPage()
      drawHeader()
    }

    let currentX = tableLeft
    const topY = doc.y
    columns.forEach((column) => {
      doc.save()
      doc.rect(currentX, topY, column.width, rowHeight).stroke(BORDER_COLOR)
      doc.restore()
      doc.fillColor(TEXT_COLOR).font('Helvetica').fontSize(8.5)
      doc.text(row[column.key] || '-', currentX + cellPadX, topY + cellPadY, {
        width: column.width - cellPadX * 2,
        align: column.align || 'left',
      })
      currentX += column.width
    })
    doc.y = topY + rowHeight
  }

  drawHeader()
  if (!rows.length) {
    drawRow({ [columns[0].key]: emptyText })
  } else {
    rows.forEach(drawRow)
  }

  doc.moveDown(0.9)
  if (tableWidth < doc.page.width - doc.page.margins.left - doc.page.margins.right) {
    doc.x = tableLeft
  }
}

export function drawRule(doc: PDFKit.PDFDocument) {
  const left = doc.page.margins.left
  const right = doc.page.width - doc.page.margins.right
  const y = doc.y
  doc.save()
  doc.moveTo(left, y).lineTo(right, y).strokeColor(BORDER_COLOR).stroke()
  doc.restore()
}

export function ensureSpace(doc: PDFKit.PDFDocument, requiredHeight: number) {
  const bottomLimit = doc.page.height - doc.page.margins.bottom
  if (doc.y + requiredHeight > bottomLimit) doc.addPage()
}

function drawFooter(doc: PDFKit.PDFDocument, footer: FooterMeta, pageNumber: number, pageCount: number) {
  const left = doc.page.margins.left
  const right = doc.page.width - doc.page.margins.right
  const topY = doc.page.height - PAGE_MARGIN - 14
  doc.save()
  doc.moveTo(left, topY - 6).lineTo(right, topY - 6).strokeColor(BORDER_COLOR).stroke()
  doc.fillColor(MUTED_COLOR).font('Helvetica').fontSize(7.5)
  doc.text(
    `Usuario: ${footer.downloadedBy} | Fecha: ${footer.generatedAt.toLocaleString('es-CL')} | Tipo: ${footer.documentType} | ID: ${footer.exportId} | Folio: ${footer.sequenceLabel} | Pagina ${pageNumber}/${pageCount}`,
    left,
    topY,
    { width: right - left, align: 'left' }
  )
  doc.restore()
}
