import { SignUpForm } from './SignUpForm';

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight">Start your gym</h1>
        <p className="mt-2 text-neutral-400 text-sm">
          Create an owner account and name your gym. Members scan QR codes you generate.
        </p>
        <div className="mt-8">
          <SignUpForm />
        </div>
        <p className="mt-6 text-xs text-neutral-500">
          Already have an account?{' '}
          <a href="/owner/sign-in" className="underline text-neutral-300">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
