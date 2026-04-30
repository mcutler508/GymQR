import { SignInForm } from './SignInForm';

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-neutral-400 text-sm">Welcome back to central command.</p>
        <div className="mt-8">
          <SignInForm />
        </div>
        <p className="mt-6 text-xs text-neutral-500">
          New here?{' '}
          <a href="/owner/sign-up" className="underline text-neutral-300">
            Create an account
          </a>
        </p>
      </div>
    </main>
  );
}
