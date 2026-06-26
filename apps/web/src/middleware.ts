import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in'
const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-in'
const authorizedParties = process.env.CLERK_AUTHORIZED_PARTIES
  ?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const isAdminLoginRoute = createRouteMatcher(['/admin/login'])
const isAdminRoute = createRouteMatcher(['/admin(.*)'])
const isSignUpRoute = createRouteMatcher(['/sign-up(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isSignUpRoute(req)) {
    return Response.redirect(new URL(signInUrl, req.url))
  }

  if (isAdminRoute(req) && !isAdminLoginRoute(req)) {
    const session = await auth()

    if (!session.userId) {
      return session.redirectToSignIn({ returnBackUrl: req.url })
    }
  }
}, {
  signInUrl,
  signUpUrl,
  authorizedParties,
})

export const config = {
  matcher: [
    '/((?!api|trpc|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
}
