import mongoose from 'mongoose'

let connectionPromise: Promise<typeof mongoose> | null = null

export async function connectToMongo() {
  if (mongoose.connection.readyState === 1) return mongoose

  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI no configurado')

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(uri, {
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
