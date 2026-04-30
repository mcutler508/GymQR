import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="p-6 max-w-md mx-auto text-center bg-canvas text-ink min-h-screen pt-16">
      <h1 className="text-xl font-semibold mb-2">Invalid QR</h1>
      <p className="text-muted text-sm mb-6">
        This sticker doesn&apos;t match any equipment. It may have been replaced.
      </p>
      <Link href="/" className="text-sm underline text-muted-strong">
        Back to home
      </Link>
    </main>
  );
}
