import { NextFunction, Request, Response, Router } from 'express'
import { z } from 'zod'
import { connectToDatabase } from '../config/db'
import { requireAdmin } from '../middleware/auth'
import { createError } from '../middleware/errorHandler'
import { AvailabilityModel } from '../models/Availability'
import { getAvailableSlots, getOrCreateDefaultAvailability } from '../services/availability'

const router = Router()

const dateQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

const availabilitySchema = z.object({
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

router.get('/slots', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date } = dateQuerySchema.parse(req.query)
    await connectToDatabase()

    const slots = await getAvailableSlots(date)
    res.json({ success: true, date, slots })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('Fecha inválida', 400) : error)
  }
})

router.get('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await connectToDatabase()
    const availability = await getOrCreateDefaultAvailability()
    res.json({ success: true, availability })
  } catch (error) {
    next(error)
  }
})

router.put('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = availabilitySchema.parse(req.body)
    await connectToDatabase()

    const availability = await AvailabilityModel.findOneAndUpdate(
      { name: 'default' },
      { ...payload, timezone: 'America/Santiago' },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )

    res.json({ success: true, availability })
  } catch (error) {
    next(error instanceof z.ZodError ? createError('Configuración de disponibilidad inválida', 400) : error)
  }
})

export default router
