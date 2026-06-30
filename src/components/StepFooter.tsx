/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface StepFooterProps {
  pasoActual: number;
  totalPasos: number;
  onNext: () => void;
  onPrev: () => void;
  canNext: boolean;
  nextLabel?: string;
  isSubmitting?: boolean;
}

export default function StepFooter({
  pasoActual,
  totalPasos,
  onNext,
  onPrev,
  canNext,
  nextLabel = 'Siguiente',
  isSubmitting = false,
}: StepFooterProps) {
  return (
    <footer className="h-20 border-t border-zinc-200 flex items-center justify-between px-5 sm:px-8 bg-white shrink-0 z-30 select-none pb-safe">
      {/* Botón Atrás */}
      <div>
        {pasoActual > 0 && pasoActual < totalPasos ? (
          <button
            type="button"
            onClick={onPrev}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 active:bg-zinc-100 transition-all rounded-xl cursor-pointer min-h-[44px] shadow-sm"
            id={`btn-prev-step-${pasoActual}`}
          >
            <ArrowLeft className="w-4 h-4 text-zinc-600" />
            <span className="hidden xs:inline">Atrás</span>
          </button>
        ) : (
          <div className="w-10 h-10" />
        )}
      </div>

      {/* Indicador de progreso por puntos (Premium Pills) */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalPasos + 1 }).map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 transition-all duration-300 rounded-full ${
              idx === pasoActual
                ? 'w-8 bg-zinc-900'
                : idx < pasoActual
                ? 'w-2 bg-zinc-400'
                : 'w-2 bg-zinc-200'
            }`}
          />
        ))}
      </div>

      {/* Botón Siguiente / Acción */}
      <div>
        {pasoActual < totalPasos ? (
          <button
            type="button"
            disabled={!canNext || isSubmitting}
            onClick={onNext}
            className={`flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-all min-h-[44px] cursor-pointer rounded-xl ${
              canNext && !isSubmitting
                ? 'bg-zinc-950 text-white hover:bg-zinc-800 active:bg-zinc-900 border border-zinc-950 shadow-sm hover:shadow'
                : 'bg-zinc-100 text-zinc-400 border border-zinc-100 cursor-not-allowed opacity-60'
            }`}
            id={`btn-next-step-${pasoActual}`}
          >
            <span>{isSubmitting ? 'Cargando...' : nextLabel}</span>
            {!isSubmitting && <ArrowRight className="w-4 h-4" />}
          </button>
        ) : (
          <div className="w-10 h-10" />
        )}
      </div>
    </footer>
  );
}
