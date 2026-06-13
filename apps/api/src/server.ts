import compression from 'compression'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import helmet from 'helmet'
import { errorHandler } from './middleware/errorHandler'
import appointmentRoutes from './routes/appointments'
import authRoutes from './routes/auth'
import availabilityRoutes from './routes/availability'
import contactRoutes from './routes/contact'
import crmRoutes from './routes/crm'
import userRoutes from './routes/users'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(helmet())
app.use(cors())
app.use(compression())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/availability', availabilityRoutes)
app.use('/api/contact', contactRoutes)
app.use('/api/crm', crmRoutes)
app.use('/api/users', userRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Error handling middleware (must be last)
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`)
  console.log(`📊 Health check available at http://localhost:${PORT}/health`)
})

export default app
