import { NextRequest } from 'next/server'
import { z } from 'zod'

import { connectToDatabase } from '../../../../../api/src/config/db'
import { AvailabilityModel } from '../../../../../api/src/models/Availability'
import { getOrCreateDefaultAvailability } from '../../../../../api/src/services/availability'
import { createError, toErrorResponse } from '../_lib/apiError'
import { requirePermission } from '../_lib/auth'

const availabilitySchema = z
  .object({
    businessDays: z.array(z.number().min(0).max(6)).min(1),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    meetingDurationMinutes: z.number().min(15).max(240),
    blockedSlots: z
      .array(
        z.object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          start: z.string().regex(/^\d{2}:\d{2}$/),
          end: z.string().regex(/^\d{2}:\d{2}$/),
          reason: z.string().optional(),
        })
      )
      .default([]),
  })
  .superRefine((value, context) => {
    if (value.startTime >= value.endTime) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'La hora de término debe ser posterior a la hora de inicio',
      })
    }

    value.blockedSlots.forEach((slot, index) => {
      if (slot.start >= slot.end) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['blockedSlots', index, 'end'],
          message: 'El término del bloqueo debe ser posterior al inicio',
        })
      }
    })
  })

export async function GET(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'tasks', 'read')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    await connectToDatabase()
    const availability = await getOrCreateDefaultAvailability()
    return Response.json({ success: true, availability })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authorized = await requirePermission(req, 'tasks', 'admin')
    if (authorized instanceof Response && 'status' in authorized) return authorized

    const payload = availabilitySchema.parse(await req.json())
    await connectToDatabase()

    const availability = await AvailabilityModel.findOneAndUpdate(
      { name: 'default' },
      { ...payload, timezone: 'America/Santiago' },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )

    return Response.json({ success: true, availability })
  } catch (err) {
    return err instanceof z.ZodError
      ? toErrorResponse(createError('Configuración de disponibilidad inválida', 400))
      : toErrorResponse(err)
  }
}
