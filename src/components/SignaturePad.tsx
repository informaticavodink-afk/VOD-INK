/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import SignaturePadClass from 'signature_pad';
import { Eraser, Check, FilePenLine } from 'lucide-react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClear: () => void;
  initialDataUrl?: string;
  placeholderText?: string;
  id?: string;
}

export default function SignaturePad({
  onSave,
  onClear,
  initialDataUrl,
  placeholderText = 'Firme aquí con el dedo o lápiz óptico',
  id = 'signature-pad',
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const signaturePadRef = useRef<SignaturePadClass | null>(null);
  const [hasStroke, setHasStroke] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialDataUrl || null);

  useEffect(() => {
    if (initialDataUrl) {
      setPreviewUrl(initialDataUrl);
      setIsLocked(true);
    }
  }, [initialDataUrl]);

  const initPad = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create the signature pad
    const pad = new SignaturePadClass(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
      minWidth: 1.5,
      maxWidth: 4.5,
    });

    pad.addEventListener('endStroke', () => {
      setHasStroke(!pad.isEmpty());
    });

    signaturePadRef.current = pad;
    resizeCanvas();
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !signaturePadRef.current) return;

    // Only resize if not locked
    if (isLocked) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    
    // Set display size
    const displayWidth = container.clientWidth;
    const displayHeight = container.clientHeight;

    canvas.width = displayWidth * ratio;
    canvas.height = displayHeight * ratio;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
    }

    signaturePadRef.current.clear();
    setHasStroke(false);
  };

  // Initialize and handle resize
  useEffect(() => {
    if (!isLocked) {
      initPad();

      const handleResize = () => {
        resizeCanvas();
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        if (signaturePadRef.current) {
          signaturePadRef.current.off();
        }
      };
    }
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
    // Use setTimeout to ensure canvas element renders and is selected
    setTimeout(() => {
      initPad();
    }, 50);
  };

  return (
    <div className="flex flex-col w-full h-full max-h-[380px] border border-zinc-200/80 p-3 bg-white relative rounded-2xl shadow-sm transition-all hover:border-zinc-300">
      {isLocked && previewUrl ? (
        // Preview state
        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50/50 border border-dashed border-zinc-200 rounded-xl relative overflow-hidden">
          <img
            src={previewUrl}
            alt="Firma"
            className="max-h-[80%] max-w-[90%] object-contain bg-white border border-zinc-200 shadow-sm rounded-xl p-3"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-3 right-3 bg-zinc-950 text-white px-3 py-1 text-[10px] font-mono font-bold rounded-full flex items-center gap-1 shadow-sm">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            REGISTRADA
          </div>

          <button
            type="button"
            onClick={handleUnlock}
            className="absolute bottom-4 flex items-center gap-2 px-5 py-2.5 border border-zinc-200 bg-white text-zinc-700 text-xs font-semibold rounded-xl hover:bg-zinc-50 active:bg-zinc-100 min-h-[44px] cursor-pointer transition-all shadow-sm hover:border-zinc-300"
            id={`${id}-unlock`}
          >
            <FilePenLine className="w-4 h-4 text-zinc-500" />
            Volver a firmar
          </button>
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
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all min-h-[44px] cursor-pointer ${
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
