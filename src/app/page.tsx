import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <header>
          <h1 className="text-5xl font-semibold tracking-tight">RepTag</h1>
          <p className="mt-3 text-xl text-neutral-400">Your gym remembers your lifts.</p>
        </header>

        <section className="mt-12 space-y-3 text-neutral-300">
          <p>Stick a QR on a machine. A member scans it.</p>
          <p>They see their last lift on that exact piece of equipment, log a new set in seconds, and move on.</p>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/owner/sign-up"
            className="px-5 py-3 rounded-lg bg-white text-black font-semibold"
          >
            Start a gym
          </Link>
          <Link
            href="/owner/sign-in"
            className="px-5 py-3 rounded-lg border border-neutral-700"
          >
            Owner sign in
          </Link>
        </div>

        <p className="mt-12 text-xs text-neutral-600">
          Members? Just scan the QR sticker on your machine.
        </p>
      </div>
    </main>
  );
}
