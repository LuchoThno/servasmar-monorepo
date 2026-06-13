import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <SignIn fallbackRedirectUrl="/admin" signUpUrl="/sign-up" />
    </main>
  )
}
