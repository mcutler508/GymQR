'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateGymTagline } from '../../actions';

type Position = 'top' | 'bottom';

export function TaglineEditor({
  currentTagline,
  currentPosition,
}: {
  currentTagline: string;
  currentPosition: Position;
}) {
  const router = useRouter();
  const [tagline, setTagline] = useState(currentTagline);
  const [position, setPosition] = useState<Position>(currentPosition);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const dirty =
    tagline.trim() !== currentTagline.trim() || position !== currentPosition;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (pending || !dirty) return;
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const res = await updateGymTagline({ tagline: tagline.trim(), position });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setMsg('Saved');
      router.refresh();
    });
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <label className="block">
        <span className="block text-sm text-neutral-400 mb-2">Tagline text</span>
        <input
          type="text"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={120}
          placeholder="Leave blank to hide"
          disabled={pending}
          className="w-full max-w-md px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 focus:border-neutral-500 focus:outline-none disabled:opacity-50"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="block text-sm text-neutral-400 mb-2">
          Position on sticker
        </legend>
        <div className="flex gap-2">
          {(['top', 'bottom'] as const).map((p) => (
            <label
              key={p}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                position === p
                  ? 'border-neutral-300 bg-neutral-800 text-neutral-100'
                  : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <input
                type="radio"
                name="tagline-position"
                value={p}
                checked={position === p}
                onChange={() => setPosition(p)}
                disabled={pending}
                className="sr-only"
              />
              <span className="capitalize">{p}</span>
              <span className="text-neutral-500 text-xs">
                {p === 'top' ? '· above QR' : '· below QR'}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={pending || !dirty}
        className="px-4 py-2 rounded-lg bg-neutral-100 text-neutral-900 text-sm font-medium hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pending ? 'Saving…' : 'Save'}
      </button>

      {msg && <p className="text-sm text-emerald-400">{msg}</p>}
      {err && <p className="text-sm text-red-400">Couldn&apos;t save: {err}</p>}
    </form>
  );
}
