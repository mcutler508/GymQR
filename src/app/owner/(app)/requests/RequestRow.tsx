'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approveRequest, dismissRequest } from './actions';

type Props = {
  id: string;
  name: string;
  description: string | null;
  memberName: string | null;
  createdAt: string;
  status: 'pending' | 'approved' | 'dismissed';
};

export function RequestRow(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const isPending = props.status === 'pending';

  function onApprove() {
    startTransition(async () => {
      // The server action redirects to the prefilled equipment form. No client
      // navigation needed.
      await approveRequest({ id: props.id });
    });
  }

  function onDismiss() {
    startTransition(async () => {
      const res = await dismissRequest({ id: props.id });
      if (res.ok) router.refresh();
    });
  }

  return (
    <li className="flex items-start justify-between gap-4 border-b border-white/10 px-1 py-5">
      <div className="min-w-0">
        <p className="font-display text-lg text-white">{props.name}</p>
        {props.description && (
          <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">{props.description}</p>
        )}
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">
          {props.memberName ?? 'unknown member'} &middot; {fmtRelative(props.createdAt)}
          {!isPending && (
            <>
              {' '}&middot;{' '}
              <span className={props.status === 'approved' ? 'text-emerald-400' : 'text-zinc-500'}>
                {props.status}
              </span>
            </>
          )}
        </p>
      </div>
      {isPending && (
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={pending}
            className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={onDismiss}
            disabled={pending}
            className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-50"
          >
            Dismiss
          </button>
        </div>
      )}
    </li>
  );
}

function fmtRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diffSec = Math.round((Date.now() - t) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 7) return `${Math.round(diffSec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
