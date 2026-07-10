import { supabase } from '@/lib/supabase';
import { createHash } from 'crypto';
import Image from 'next/image';
import Link from 'next/link';
import { ResetForm } from './ResetForm';

export const dynamic = 'force-dynamic';

type ResetMember = {
  id: string;
  name: string;
  reset_expires_at: string | null;
  gyms: { name: string } | null;
};

export default async function ResetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const token_hash = createHash('sha256').update(token).digest('hex');

  const { data } = await supabase
    .from('members')
    .select('id, name, reset_expires_at, gyms!inner(name)')
    .eq('reset_token', token_hash)
    .maybeSingle<ResetMember>();

  const expired =
    !data ||
    !data.reset_expires_at ||
    new Date(data.reset_expires_at) < new Date();

  if (expired) {
    return (
      <main className="p-6 max-w-md mx-auto text-center pt-16 min-h-screen bg-canvas text-ink">
        <Image
          src="/repetoIQicon.png"
          alt="RepetoIQ"
          width={80}
          height={80}
          className="mx-auto mb-4 h-20 w-20"
        />
        <h1 className="text-xl font-semibold mb-2">This link doesn’t work</h1>
        <p className="text-muted text-sm mb-8">
          Reset links are single-use and expire after 30 minutes. Head back to any machine and
          tap “Forgot passcode?” again.
        </p>
        <Link
          href="/scan"
          className="inline-block px-4 py-3 rounded bg-accent text-accent-ink font-semibold"
        >
          Back to scan
        </Link>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-md mx-auto min-h-screen bg-canvas text-ink">
      <div className="pt-8 mb-6 flex items-center gap-2">
        <Image
          src="/repetoIQicon.png"
          alt="RepetoIQ"
          width={40}
          height={40}
          className="h-10 w-10"
        />
        <span className="font-display text-sm tracking-tight text-muted">RepetoIQ</span>
      </div>
      <h1 className="text-2xl font-display tracking-tight mb-2">Pick a new passcode</h1>
      <p className="text-sm text-muted mb-6">
        Welcome back, {data!.name}. Pick a new 4-digit passcode for {data!.gyms?.name ?? 'your gym'}.
      </p>
      <ResetForm token={token} />
    </main>
  );
}
