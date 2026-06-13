import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isAdminRoute = createRouteMatcher(['/admin(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isAdminRoute(req)) {
    await auth.protect()
  }
}, {
  signInUrl: '/sign-in',
  signUpUrl: '/sign-up',
})

export const config = {
  matcher: [
    '/admin/:path*',
  ],
}
