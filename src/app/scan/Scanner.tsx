'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { requestEquipment } from './actions';

type Status = 'init' | 'requesting' | 'scanning' | 'detected' | 'denied' | 'error';

export function Scanner({ identified }: { identified: boolean }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);
  const [status, setStatus] = useState<Status>('init');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    stoppedRef.current = false;
    let detector: { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> } | null = null;
    let jsQRFn: ((d: Uint8ClampedArray, w: number, h: number) => { data: string } | null) | null = null;

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setStatus('error');
          setErrMsg('This browser does not support camera access.');
          return;
        }
        setStatus('requesting');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        // Torch is Android Chrome only today; iOS reports no capability.
        const caps = stream.getVideoTracks()[0]?.getCapabilities?.() as
          | { torch?: boolean }
          | undefined;
        if (caps?.torch) setTorchAvailable(true);

        // Prefer the native BarcodeDetector when available — much faster.
        const w = window as unknown as {
          BarcodeDetector?: new (opts: { formats: string[] }) => {
            detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
          };
        };
        if (w.BarcodeDetector) {
          detector = new w.BarcodeDetector({ formats: ['qr_code'] });
        } else {
          const mod = await import('jsqr');
          jsQRFn = mod.default as unknown as typeof jsQRFn;
        }

        setStatus('scanning');
        loop();
      } catch (e) {
        if (e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError')) {
          setStatus('denied');
        } else {
          setStatus('error');
          setErrMsg(e instanceof Error ? e.message : 'Could not start camera.');
        }
      }
    }

    let lastDecode = 0;
    function loop() {
      if (stoppedRef.current) return;
      const now = performance.now();
      // Throttle to ~12fps — decode is the expensive bit.
      if (now - lastDecode < 80) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      lastDecode = now;
      void tryDecode();
      rafRef.current = requestAnimationFrame(loop);
    }

    async function tryDecode() {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      if (detector) {
        try {
          const codes = await detector.detect(video);
          if (codes[0]?.rawValue) {
            void onDecoded(codes[0].rawValue);
          }
        } catch {
          // ignore transient detect errors
        }
        return;
      }

      if (jsQRFn) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) return;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, w, h);
        const img = ctx.getImageData(0, 0, w, h);
        const result = jsQRFn(img.data, w, h);
        if (result?.data) {
          void onDecoded(result.data);
        }
      }
    }

    function onDecoded(raw: string) {
      if (stoppedRef.current) return;
      const slug = extractSlug(raw);
      if (!slug) return;
      stoppedRef.current = true;
      try {
        navigator.vibrate?.(15);
      } catch {
        /* iOS */
      }
      setStatus('detected');
      stopCamera();
      router.push(`/scan/${slug}`);
    }

    function stopCamera() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      const stream = streamRef.current;
      if (stream) {
        for (const t of stream.getTracks()) t.stop();
      }
      streamRef.current = null;
    }

    void start();

    return () => {
      stoppedRef.current = true;
      stopCamera();
    };
    // router is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      setTorchAvailable(false);
    }
  }

  const live = status === 'requesting' || status === 'scanning' || status === 'detected';

  return (
    <main className="mx-auto w-full max-w-md px-5 pt-5 pb-6">
      <header className="mb-4">
        <h1 className="font-display text-2xl tracking-tight leading-none">Scan a machine</h1>
        <p className="mt-1.5 text-sm text-muted-strong">Point at the QR sticker. It auto-detects.</p>
      </header>

      {status === 'denied' && <CameraDenied />}
      {status === 'error' && <CameraError message={errMsg} />}

      {live && (
        <div className="relative w-full aspect-[3/4] max-h-[62dvh] overflow-hidden rounded-card bg-surface border border-line">
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          <Reticle detected={status === 'detected'} scanning={status === 'scanning'} />
          {status === 'requesting' && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-strong">
              Asking for camera…
            </div>
          )}
          {status === 'detected' && (
            <div className="absolute inset-x-0 bottom-0 p-4 text-center text-sm font-semibold text-accent bg-gradient-to-t from-black/70 to-transparent">
              Got it. Loading…
            </div>
          )}
          {torchAvailable && status === 'scanning' && (
            <button
              type="button"
              onClick={toggleTorch}
              aria-pressed={torchOn}
              aria-label={torchOn ? 'Turn flashlight off' : 'Turn flashlight on'}
              className={[
                'absolute right-3 top-3 h-12 w-12 flex items-center justify-center rounded-full backdrop-blur-md transition-colors',
                torchOn ? 'bg-accent text-accent-ink' : 'bg-black/50 text-white',
              ].join(' ')}
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 2h12v5l-3 4v11H9V11L6 7z" />
                <path d="M12 14v3" />
              </svg>
            </button>
          )}
        </div>
      )}

      {!identified && (
        <button
          type="button"
          onClick={() => {
            // Go back to wherever the member came from. With no history
            // (direct URL entry), drop them at /me/stats which handles
            // unidentified gracefully.
            if (typeof window !== 'undefined' && window.history.length > 1) {
              router.back();
            } else {
              router.push('/me/stats');
            }
          }}
          className="mt-6 min-h-11 block w-full text-center text-sm text-muted-strong underline underline-offset-4"
        >
          Cancel
        </button>
      )}

      <RequestEquipment />
    </main>
  );
}

function RequestEquipment() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await requestEquipment({ name, description });
      if (res.ok) {
        setMsg({ kind: 'ok', text: 'Sent. Your gym will see it in their inbox.' });
        setName('');
        setDescription('');
      } else {
        setMsg({ kind: 'err', text: res.error });
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 min-h-11 block w-full text-center text-sm text-muted-strong underline underline-offset-4"
      >
        Don&rsquo;t see your machine? Request it.
      </button>
    );
  }

  return (
    <div className="mt-6 p-4 rounded-card border border-line bg-surface">
      <p className="text-sm font-medium">Request a new machine</p>
      <p className="mt-1 text-xs text-muted">
        We&rsquo;ll send the name to your gym. They&rsquo;ll print a sticker.
      </p>
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Hack Squat"
          maxLength={80}
          autoFocus
          className="w-full px-3 py-3 rounded bg-canvas border border-line focus:border-accent focus:outline-none text-base"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional) — brand, location, why you want it…"
          maxLength={500}
          rows={3}
          className="w-full px-3 py-3 rounded bg-canvas border border-line focus:border-accent focus:outline-none text-base resize-none"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending || !name.trim()}
            className="flex-1 min-h-11 px-3 rounded bg-accent text-accent-ink text-sm font-semibold disabled:opacity-50"
          >
            {pending ? 'Sending…' : 'Send request'}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setMsg(null);
              setName('');
              setDescription('');
            }}
            className="min-h-11 px-4 rounded border border-line text-sm text-muted-strong"
          >
            Cancel
          </button>
        </div>
        {msg && (
          <p role="status" className={`text-sm ${msg.kind === 'ok' ? 'text-success' : 'text-danger'}`}>
            {msg.text}
          </p>
        )}
      </form>
    </div>
  );
}

function Reticle({ detected, scanning }: { detected: boolean; scanning: boolean }) {
  const corner = `absolute h-10 w-10 border-[3px] transition-colors ${
    detected ? 'border-accent' : 'border-white/85'
  }`;
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] aspect-square">
        <span className={`${corner} left-0 top-0 border-r-0 border-b-0 rounded-tl-card`} />
        <span className={`${corner} right-0 top-0 border-l-0 border-b-0 rounded-tr-card`} />
        <span className={`${corner} left-0 bottom-0 border-r-0 border-t-0 rounded-bl-card`} />
        <span className={`${corner} right-0 bottom-0 border-l-0 border-t-0 rounded-br-card`} />
        {scanning && (
          <span className="animate-scan-line absolute inset-x-3 top-0 h-0.5 rounded-full bg-accent opacity-0" />
        )}
      </div>
    </div>
  );
}

function CameraDenied() {
  return (
    <div className="p-6 rounded-card bg-surface border border-line text-sm">
      <p className="font-medium">Camera permission needed</p>
      <p className="mt-2 text-muted">
        We need camera access to scan the QR sticker. Allow it in your browser settings, or just open
        your phone&apos;s camera app and point it at the sticker — that works too.
      </p>
    </div>
  );
}

function CameraError({ message }: { message: string | null }) {
  return (
    <div className="p-6 rounded-card bg-surface border border-line text-sm">
      <p className="font-medium">Camera couldn&apos;t start</p>
      <p className="mt-2 text-muted">{message ?? 'Unknown error.'}</p>
      <p className="mt-2 text-muted text-xs">
        Workaround: open your phone&apos;s camera app and scan the sticker that way — it points back here.
      </p>
    </div>
  );
}

/**
 * Extract a slug from whatever the QR encoded. We accept:
 * - A full URL like `https://repetoiq.vercel.app/scan/leg-press-04-a8f3`
 * - A relative path like `/scan/leg-press-04-a8f3`
 * - A bare slug
 *
 * Always navigate on the *current* origin so a member who scanned a sticker
 * printed for a different deployment still gets routed to where they are.
 */
function extractSlug(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Try URL parse first.
  try {
    const u = new URL(trimmed);
    const m = u.pathname.match(/\/scan\/([^/?#]+)/);
    if (m) return decodeURIComponent(m[1]);
  } catch {
    // not a URL
  }
  // Relative path?
  const m = trimmed.match(/\/scan\/([^/?#]+)/);
  if (m) return decodeURIComponent(m[1]);
  // Bare slug (no slashes, looks slug-y)?
  if (/^[a-z0-9-]+$/i.test(trimmed)) return trimmed;
  return null;
}
