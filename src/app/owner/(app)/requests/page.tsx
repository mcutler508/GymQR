import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase-server';
import { EditorialHeader } from '../../_components/editorial-header';
import { MonoRule } from '../../_components/mono-rule';
import { RequestRow } from './RequestRow';

export const dynamic = 'force-dynamic';

type RequestRecord = {
  id: string;
  name: string;
  description: string | null;
  status: 'pending' | 'approved' | 'dismissed';
  created_at: string;
  members: { name: string } | null;
};

export default async function RequestsPage() {
  const supabase = await getServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect('/owner/sign-in');

  const { data: gym } = await supabase
    .from('gyms')
    .select('id')
    .eq('owner_id', userData.user.id)
    .maybeSingle<{ id: string }>();
  if (!gym) redirect('/owner');

  const { data: requests } = await supabase
    .from('equipment_requests')
    .select('id, name, description, status, created_at, members(name)')
    .eq('gym_id', gym.id)
    .order('created_at', { ascending: false })
    .returns<RequestRecord[]>();

  const rows = requests ?? [];
  const pending = rows.filter((r) => r.status === 'pending');
  const resolved = rows.filter((r) => r.status !== 'pending');

  return (
    <div className="space-y-16">
      <EditorialHeader
        kicker="Inbox"
        title="Equipment requests"
        subtitle="Members tell you what machines they want. You decide what makes the floor."
      />

      <section>
        <MonoRule>Pending ({pending.length})</MonoRule>
        {pending.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500">Nothing pending. Quiet floor.</p>
        ) : (
          <ul className="mt-2">
            {pending.map((r) => (
              <RequestRow
                key={r.id}
                id={r.id}
                name={r.name}
                description={r.description}
                memberName={r.members?.name ?? null}
                createdAt={r.created_at}
                status={r.status}
              />
            ))}
          </ul>
        )}
      </section>

      {resolved.length > 0 && (
        <section>
          <MonoRule>History</MonoRule>
          <ul className="mt-2">
            {resolved.map((r) => (
              <RequestRow
                key={r.id}
                id={r.id}
                name={r.name}
                description={r.description}
                memberName={r.members?.name ?? null}
                createdAt={r.created_at}
                status={r.status}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
