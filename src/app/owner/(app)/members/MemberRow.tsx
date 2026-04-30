'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { resetMemberPasscode } from '../../actions';

type Props = {
  id: string;
  name: string;
  joined: string;
  hasPasscode: boolean;
  setCount: number;
  machineCount: number;
  lastSet: string | null;
};

export function MemberRow(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function onReset() {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    startTransition(async () => {
      const res = await resetMemberPasscode({ memberId: props.id });
      if (res.ok) {
        setMsg('Reset. Their next scan will ask for a new passcode.');
        setConfirmed(false);
        router.refresh();
      } else {
        setMsg(`Couldn’t reset: ${res.error}`);
      }
    });
  }

  return (
    <li className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">
            {props.name}
            {!props.hasPasscode && (
              <span className="ml-2 text-xs uppercase tracking-wider text-amber-400">
                no passcode
              </span>
            )}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Joined {fmtDate(props.joined)}
            {props.lastSet && (
              <>
                {' · '}Last set <span className="text-neutral-300">{fmtRelative(props.lastSet)}</span>
              </>
            )}
          </p>
          <p className="text-sm text-neutral-300 mt-2 tabular-nums">
            {props.setCount} sets across {props.machineCount} machine{props.machineCount === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button
            type="button"
            onClick={onReset}
            disabled={pending}
            className={`px-3 py-1.5 text-sm rounded-md text-center ${
              confirmed
                ? 'bg-amber-400 text-black font-semibold'
                : 'border border-neutral-700'
            } disabled:opacity-50`}
          >
            {pending ? 'Resetting…' : confirmed ? 'Confirm reset' : 'Reset passcode'}
          </button>
          {confirmed && !pending && (
            <button
              type="button"
              onClick={() => setConfirmed(false)}
              className="text-xs text-neutral-500 underline"
            >
              cancel
            </button>
          )}
        </div>
      </div>
      {msg && <p className="mt-2 text-xs text-neutral-400">{msg}</p>}
    </li>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diffSec = Math.round((Date.now() - t) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 7) return `${Math.round(diffSec / 86400)}d ago`;
  return fmtDate(iso);
}
