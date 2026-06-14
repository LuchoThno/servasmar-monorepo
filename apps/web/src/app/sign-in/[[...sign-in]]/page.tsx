import { SignIn } from '@clerk/nextjs'

export default function Page() {
  const afterSignInUrl = process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || '/admin'

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 bg-cover bg-center px-4 py-12"
      style={{ backgroundImage: "url('/fondo-login.png')" }}
    >
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[1px]" />
      <section className="relative z-10">
        <SignIn fallbackRedirectUrl={afterSignInUrl} forceRedirectUrl={afterSignInUrl} />
      </section>
    </main>
  )
}
