import mongoose from 'mongoose'

let connectionPromise: Promise<typeof mongoose> | null = null

export const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI no configurado')
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB || undefined,
      serverSelectionTimeoutMS: 5000,
    })
  }

  try {
    return await connectionPromise
  } catch (error) {
    connectionPromise = null
    throw error
  }
}
