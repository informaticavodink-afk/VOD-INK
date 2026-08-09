/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import SignaturePadClass from 'signature_pad';
import { Eraser, Check, FilePenLine } from 'lucide-react';

type StrokeGroup = { points: Array<{ x: number; y: number; [key: string]: unknown }>; [key: string]: unknown };

export function scaleStrokeData(groups: StrokeGroup[], scaleX: number, scaleY: number): StrokeGroup[] {
  return groups.map((group) => ({
    ...group,
    points: group.points.map((point) => ({ ...point, x: point.x * scaleX, y: point.y * scaleY })),
  }));
}

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClear: () => void;
  initialDataUrl?: string;
  placeholderText?: string;
  id?: string;
  onConfirmSubmit?: () => void;
}

export default function SignaturePad({
  onSave,
  onClear,
  initialDataUrl,
  placeholderText = 'Firme aquí con el dedo o lápiz óptico',
  id = 'signature-pad',
  onConfirmSubmit,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const signaturePadRef = useRef<SignaturePadClass | null>(null);
  const [hasStroke, setHasStroke] = useState(false);
  const [isLocked, setIsLocked] = useState(() => !!initialDataUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialDataUrl || null);

  useEffect(() => {
    if (initialDataUrl) {
      setPreviewUrl(initialDataUrl);
      setIsLocked(true);
    }
  }, [initialDataUrl]);

  // Initialize and release the canvas event handlers whenever signing is enabled.
  useEffect(() => {
    if (isLocked) return undefined;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    const pad = new SignaturePadClass(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
      minWidth: 1.5,
      maxWidth: 4.5,
    });
    const handleEndStroke = () => setHasStroke(!pad.isEmpty());
    let previous = { width: 0, height: 0, ratio: 0 };
    const resizeCanvas = () => {
      const { width, height } = container.getBoundingClientRect();
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      if (!width || !height || (width === previous.width && height === previous.height && ratio === previous.ratio)) return;
      const strokes = pad.toData() as unknown as StrokeGroup[];
      const scaled = previous.width && previous.height
        ? scaleStrokeData(strokes, width / previous.width, height / previous.height)
        : strokes;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const context = canvas.getContext('2d');
      if (context) context.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (scaled.length) pad.fromData(scaled as unknown as Parameters<SignaturePadClass['fromData']>[0]);
      setHasStroke(scaled.length > 0);
      previous = { width, height, ratio };
    };

    pad.addEventListener('endStroke', handleEndStroke);
    signaturePadRef.current = pad;
    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(container);
    window.addEventListener('resize', resizeCanvas);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resizeCanvas);
      pad.removeEventListener('endStroke', handleEndStroke);
      pad.off();
      if (signaturePadRef.current === pad) signaturePadRef.current = null;
    };
  }, [isLocked]);

  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      setHasStroke(false);
    }
    setPreviewUrl(null);
    setIsLocked(false);
    onClear();
  };

  const handleConfirm = () => {
    if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
      const dataUrl = signaturePadRef.current.toDataURL('image/png');
      setPreviewUrl(dataUrl);
      setIsLocked(true);
      onSave(dataUrl);
    }
  };

  const handleUnlock = () => {
    setIsLocked(false);
    setHasStroke(false);
    onClear();
  };

  return (
    <div className="flex flex-col w-full h-full min-h-[240px] sm:min-h-[280px] max-h-[380px] border border-zinc-200/80 p-3 bg-white relative rounded-2xl shadow-sm transition-all hover:border-zinc-300">
      {isLocked && previewUrl ? (
        // Preview state
        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50/50 border border-dashed border-zinc-200 rounded-xl relative overflow-hidden">
          <img
            src={previewUrl}
            alt="Firma"
            className="max-h-[70%] max-w-[90%] object-contain bg-white border border-zinc-200 shadow-sm rounded-xl p-3 mb-6"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-3 right-3 bg-zinc-950 text-white px-3 py-1 text-[10px] font-mono font-bold rounded-full flex items-center gap-1 shadow-sm">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            REGISTRADA
          </div>

          <div className="absolute bottom-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleUnlock}
              className="flex items-center gap-2 px-4 py-2.5 min-w-[44px] border border-zinc-200 bg-white text-zinc-700 text-xs font-semibold rounded-xl hover:bg-zinc-50 active:bg-zinc-100 min-h-[44px] cursor-pointer transition-all shadow-sm hover:border-zinc-300"
              id={`${id}-unlock`}
            >
              <FilePenLine className="w-4 h-4 text-zinc-500" />
              Volver a firmar
            </button>
            {onConfirmSubmit && (
              <button
                type="button"
                onClick={onConfirmSubmit}
                className="flex items-center gap-2 px-4 py-2.5 min-w-[44px] bg-zinc-950 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl hover:bg-zinc-800 active:bg-zinc-900 min-h-[44px] cursor-pointer transition-all shadow-md hover:shadow-lg"
                id={`${id}-submit`}
              >
                Confirmar y enviar
              </button>
            )}
          </div>
        </div>
      ) : (
        // Signature capture state
        <div ref={containerRef} className="flex-1 bg-white relative border border-zinc-200 rounded-xl overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair touch-none"
            style={{ display: 'block' }}
          />

          {!hasStroke && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center px-4 text-center">
              <span className="text-zinc-900 font-sans font-bold text-xs uppercase tracking-tight">
                {placeholderText}
              </span>
              <div className="w-12 h-[1px] bg-zinc-200 my-2" />
              <span className="text-zinc-400 font-mono text-[9px] uppercase tracking-widest font-bold">
                Trazo de alta precisión • Decreto Cantabria 72/2006
              </span>
            </div>
          )}

          {/* Guide baseline */}
          <div className="absolute bottom-[20%] left-[10%] right-[10%] border-b border-dashed border-zinc-200 pointer-events-none" />

          {/* Action buttons embedded in the pad */}
          <div className="absolute bottom-3 right-3 flex gap-2.5 z-10">
            <button
              type="button"
              disabled={!hasStroke}
              onClick={handleClear}
              className={`flex items-center justify-center p-2.5 rounded-xl border transition-all min-h-[44px] min-w-[44px] cursor-pointer ${
                hasStroke
                  ? 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 active:bg-zinc-100 shadow-sm'
                  : 'bg-zinc-50 border-zinc-100 text-zinc-300 cursor-not-allowed opacity-50'
              }`}
              title="Borrar firma"
              id={`${id}-clear`}
            >
              <Eraser className="w-4.5 h-4.5" />
            </button>

            <button
              type="button"
              disabled={!hasStroke}
              onClick={handleConfirm}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all min-h-[44px] min-w-[44px] cursor-pointer ${
                hasStroke
                  ? 'bg-zinc-950 text-white hover:bg-zinc-800 active:bg-zinc-900 shadow-sm'
                  : 'bg-zinc-50 border-zinc-100 text-zinc-300 cursor-not-allowed opacity-50'
              }`}
              id={`${id}-confirm`}
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
