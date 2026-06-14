import { NextRequest } from 'next/server'
import { z } from 'zod'

import { connectToDatabase } from '../../../../../../api/src/config/db'
import { getAvailableSlots } from '../../../../../../api/src/services/availability'
import { createError, toErrorResponse } from '../../_lib/apiError'

const dateQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const { date } = dateQuerySchema.parse({ date: url.searchParams.get('date') ?? undefined })

    await connectToDatabase()
    const slots = await getAvailableSlots(date)

    return Response.json({ success: true, date, slots })
  } catch (err) {
    return err instanceof z.ZodError ? toErrorResponse(createError('Fecha inválida', 400)) : toErrorResponse(err)
  }
}
