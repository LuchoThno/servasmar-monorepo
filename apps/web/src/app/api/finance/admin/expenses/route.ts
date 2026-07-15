import { NextRequest } from 'next/server'
import { connectToDatabase } from '../../../../../../../api/src/config/db'
import { CrmClientModel } from '../../../../../../../api/src/models/CrmClient'
import { ExpenseModel } from '../../../../../../../api/src/models/Expense'
import { CrmProjectModel } from '../../../../../../../api/src/models/CrmProject'
import { requirePermission } from '../../../_lib/auth'
import { toErrorResponse } from '../../../_lib/apiError'
import { expenseSchema, financeSearchSchema, normalizeExpensePayload } from '@/lib/financeApi'

export async function GET(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'finance', 'read')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const url = new URL(req.url)
    const parsed = financeSearchSchema.parse({
      search: url.searchParams.get('search') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
      clientId: url.searchParams.get('clientId') ?? undefined,
      projectId: url.searchParams.get('projectId') ?? undefined,
    })

    await connectToDatabase()
    const filter: Record<string, unknown> = {}
    if (parsed.status) filter.status = parsed.status
    if (parsed.clientId) filter.clientId = parsed.clientId
    if (parsed.projectId) filter.projectId = parsed.projectId
    if (parsed.search) {
      filter.$or = [
        { supplier: { $regex: parsed.search, $options: 'i' } },
        { notes: { $regex: parsed.search, $options: 'i' } },
      ]
    }

    const expenses = await ExpenseModel.find(filter)
      .populate('clientId', 'name taxId')
      .populate('projectId', 'name code serviceType')
      .sort({ date: -1, createdAt: -1 })
      .limit(500)

    return Response.json({ success: true, expenses })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'finance', 'write')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const payload = expenseSchema.parse(await req.json())
    await connectToDatabase()

    const [client, project] = await Promise.all([
      CrmClientModel.findById(payload.clientId),
      CrmProjectModel.findById(payload.projectId),
    ])

    if (!client || !project) {
      return Response.json({ success: false, error: { message: 'Cliente o proyecto no encontrado' } }, { status: 404 })
    }

    if (String(project.clientId) !== String(client._id)) {
      return Response.json({ success: false, error: { message: 'El proyecto no pertenece al cliente seleccionado' } }, { status: 400 })
    }

    const expense = await ExpenseModel.create(normalizeExpensePayload(payload, authorized.email, 'create'))
    await expense.populate('clientId', 'name taxId')
    await expense.populate('projectId', 'name code serviceType')

    return Response.json({ success: true, expense }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
