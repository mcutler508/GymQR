'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { requestEquipment } from './actions';

type Status = 'init' | 'requesting' | 'scanning' | 'detected' | 'denied' | 'error';

export function Scanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);
  const [status, setStatus] = useState<Status>('init');
  const [errMsg, setErrMsg] = useState<string | null>(null);

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

  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <div className="w-full max-w-md p-4">
        <header className="mb-4 flex flex-col items-center text-center">
          <Image
            src="/repetoIQicon.png"
            alt="RepetoIQ"
            width={80}
            height={80}
            priority
            className="mb-2 h-20 w-20"
          />
          <h1 className="text-xl font-semibold">Scan a machine</h1>
          <p className="text-sm text-muted mt-1">Point at the QR sticker.</p>
        </header>

        {status === 'denied' && <CameraDenied />}
        {status === 'error' && <CameraError message={errMsg} />}

        {(status === 'requesting' || status === 'scanning' || status === 'detected') && (
          <div className="relative w-full aspect-square overflow-hidden rounded-card bg-surface border border-line">
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            <Reticle detected={status === 'detected'} />
            {status === 'requesting' && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-strong">
                Asking for camera…
              </div>
            )}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted">
          {status === 'detected' ? 'Got it. Loading…' : 'Hold steady — it auto-detects.'}
        </p>

        <button
          type="button"
          onClick={() => {
            // Go back to wherever the member came from (typically their last
            // scanned equipment page). If there's no history (direct URL
            // entry), drop them at /me/stats which handles unidentified
            // gracefully.
            if (typeof window !== 'undefined' && window.history.length > 1) {
              router.back();
            } else {
              router.push('/me/stats');
            }
          }}
          className="mt-8 block w-full text-center text-sm text-muted underline"
        >
          Cancel
        </button>

        <RequestEquipment />
      </div>
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
        className="mt-6 block w-full text-center text-xs text-muted underline"
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
          className="w-full px-3 py-2 rounded-lg bg-canvas border border-line focus:border-ink focus:outline-none text-sm"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional) — brand, location, why you want it…"
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-canvas border border-line focus:border-ink focus:outline-none text-sm resize-none"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending || !name.trim()}
            className="flex-1 px-3 py-2 rounded-lg bg-ink text-canvas text-sm font-medium disabled:opacity-50"
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
            className="px-3 py-2 rounded-lg border border-line text-sm text-muted"
          >
            Cancel
          </button>
        </div>
        {msg && (
          <p className={`text-xs ${msg.kind === 'ok' ? 'text-accent' : 'text-red-400'}`}>
            {msg.text}
          </p>
        )}
      </form>
    </div>
  );
}

function Reticle({ detected }: { detected: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 aspect-square rounded-card border-2 transition-colors ${
          detected ? 'border-accent' : 'border-muted/40'
        }`}
      />
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
