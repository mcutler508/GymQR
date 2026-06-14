import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { signOutAndRedirect } from './actions';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'reptag_member_id';

export default async function MemberProfilePage() {
  const store = await cookies();
  const memberId = store.get(COOKIE_NAME)!.value;

  const { data: member } = await supabase
    .from('members')
    .select('name, gym_id, gyms(name)')
    .eq('id', memberId)
    .maybeSingle<{ name: string; gym_id: string; gyms: { name: string } | null }>();

  const memberName = member?.name ?? 'Member';
  const gymName = member?.gyms?.name ?? 'Gym';

  return (
    <>
      <header className="mb-7">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted font-medium mb-1.5">
          Profile
        </p>
        <h1
          className={[
            'font-display tracking-tight leading-none',
            'halogen:text-4xl halogen:font-medium',
            'concrete:text-5xl concrete:font-black concrete:uppercase concrete:leading-[0.9]',
            'locker:text-3xl locker:font-semibold',
            'athletic:text-4xl athletic:font-black athletic:italic athletic:uppercase',
          ].join(' ')}
        >
          You
        </h1>
      </header>

      <dl className="divide-y divide-line border-y border-line mb-9">
        <Row term="Name" value={memberName} />
        <Row term="Gym" value={gymName} />
        <Row term="Device" value="Signed in on this device" mono />
      </dl>

      <form action={signOutAndRedirect}>
        <button
          type="submit"
          className={[
            'w-full px-4 py-3.5 rounded-card border border-line text-sm font-medium text-ink',
            'transition-colors hover:bg-surface-2',
            'concrete:rounded-none',
          ].join(' ')}
        >
          Sign out
        </button>
      </form>

      <p className="mt-4 text-center text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
        Signing out clears this device · your sets stay safe on the gym roster
      </p>
    </>
  );
}

function Row({ term, value, mono }: { term: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-4">
      <dt className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted shrink-0">
        {term}
      </dt>
      <dd className={mono ? 'text-xs font-mono text-muted-strong text-right' : 'font-medium text-ink text-right'}>
        {value}
      </dd>
    </div>
  );
}
