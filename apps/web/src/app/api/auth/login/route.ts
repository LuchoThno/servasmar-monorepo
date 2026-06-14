export async function POST() {
  return Response.json(
    {
      success: false,
      error: {
        message: 'La autenticación local fue migrada a Clerk. Usa /sign-in.',
      },
    },
    { status: 410 }
  )
}
