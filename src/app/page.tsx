import Link from 'next/link';
import { supabase, type Equipment } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { data, error } = await supabase
    .from('equipment')
    .select('id, qr_slug, name, machine_label, gym_name, status')
    .order('created_at', { ascending: true });

  const equipment = (data ?? []) as Equipment[];

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <header className="mt-8 mb-12">
        <h1 className="text-4xl font-semibold tracking-tight">RepTag</h1>
        <p className="mt-2 text-neutral-400">Your gym remembers your lifts.</p>
      </header>

      <section className="mb-10">
        <h2 className="text-sm uppercase tracking-wider text-neutral-500 mb-3">
          How it works
        </h2>
        <ol className="space-y-2 text-neutral-300 list-decimal list-inside">
          <li>Stick a QR on a machine.</li>
          <li>Member scans it.</li>
          <li>They see their last lift on that exact machine.</li>
          <li>They log a new set in seconds.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-neutral-500 mb-3">
          Seeded equipment {equipment.length > 0 && `(${equipment.length})`}
        </h2>

        {error && (
          <p className="text-sm text-red-400">
            Couldn&apos;t load equipment: {error.message}
          </p>
        )}

        {!error && equipment.length === 0 && (
          <p className="text-sm text-neutral-400">
            No equipment yet. Run the SQL in <code className="text-neutral-300">supabase/seed.sql</code> in the Supabase SQL editor.
          </p>
        )}

        <ul className="space-y-3">
          {equipment.map((e) => (
            <li
              key={e.id}
              className="p-4 rounded-xl bg-neutral-900 border border-neutral-800"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{e.name}</p>
                  <p className="text-sm text-neutral-400">
                    {[e.machine_label, e.gym_name].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-xs text-neutral-600 mt-1 font-mono">{e.qr_slug}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Link
                    href={`/scan/${e.qr_slug}`}
                    className="px-3 py-1.5 text-sm rounded-md bg-white text-black font-medium text-center"
                  >
                    Open scan
                  </Link>
                  <Link
                    href={`/admin/equipment/${e.id}/qr`}
                    className="px-3 py-1.5 text-sm rounded-md border border-neutral-700 text-center"
                  >
                    Print QR
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
