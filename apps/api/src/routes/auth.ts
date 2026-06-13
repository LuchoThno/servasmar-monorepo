import { Request, Response, Router } from 'express'

const router = Router()

router.post('/login', (_req: Request, res: Response) => {
  res.status(410).json({
    success: false,
    error: {
      message: 'La autenticación local fue migrada a Clerk. Usa /sign-in.',
    },
  })
})

export default router
