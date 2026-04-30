'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { Equipment } from '@/lib/supabase';

type Props = {
  equipment: Equipment;
  initialScanUrl: string;
};

export function QrClient({ equipment, initialScanUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scanUrl, setScanUrl] = useState(initialScanUrl);

  useEffect(() => {
    if (!initialScanUrl.startsWith('http')) {
      setScanUrl(`${window.location.origin}/scan/${equipment.qr_slug}`);
    }
  }, [equipment.qr_slug, initialScanUrl]);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, scanUrl, {
      width: 600,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).catch(() => {});
  }, [scanUrl]);

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `reptag-${equipment.qr_slug}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return (
    <div>
      <div className="no-print mb-6">
        <h1 className="text-2xl font-semibold">Print QR Sticker</h1>
        <p className="text-sm text-neutral-400 mt-1 break-all">Scan URL: {scanUrl}</p>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={downloadPng}
            className="px-4 py-2 rounded-lg bg-white text-black font-medium"
          >
            Download PNG
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg border border-neutral-700"
          >
            Print
          </button>
          <a
            href="/owner/equipment"
            className="px-4 py-2 rounded-lg border border-neutral-700 text-sm flex items-center"
          >
            Back to equipment
          </a>
        </div>
      </div>

      <div className="sticker p-8 rounded-2xl bg-white text-black flex flex-col items-center text-center">
        <p className="text-xs uppercase tracking-[0.2em] font-semibold">Scan to Track</p>
        <h2 className="mt-2 text-3xl font-bold">{equipment.name}</h2>
        {equipment.machine_label && (
          <p className="text-lg text-neutral-700">{equipment.machine_label}</p>
        )}
        <canvas ref={canvasRef} className="my-6" />
        <p className="text-sm text-neutral-700 italic">Your gym remembers your lifts.</p>
      </div>
    </div>
  );
}
