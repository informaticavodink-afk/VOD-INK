/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Aplicador } from '../types';
import SensitiveText from './SensitiveText';

interface HeaderProps {
  pasoActual: number;
  totalPasos: number;
  artistaSeleccionado: Aplicador | null;
  onReset: () => void;
}

export default function Header({ pasoActual, totalPasos, artistaSeleccionado, onReset }: HeaderProps) {
  return (
    <header className="min-h-16 border-b border-zinc-200/80 flex items-center justify-between gap-4 px-4 sm:px-8 pt-safe bg-white select-none shrink-0 z-30 shadow-sm/5">
      <button
        type="button"
        className="min-w-0 flex flex-col items-start text-left group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
        onClick={onReset}
        title="Volver al inicio"
        aria-label="Volver al inicio de VOD INK"
      >
        <span className="font-sans font-black text-lg tracking-[-0.04em] text-zinc-950 group-hover:text-zinc-700 transition-colors whitespace-nowrap">
          VOD INK
        </span>
        <span className="hidden sm:block font-mono text-[8px] uppercase tracking-widest text-zinc-400 font-bold leading-none mt-0.5 whitespace-nowrap">
          CANTABRIA • EST. 2024
        </span>
      </button>

      <div className="flex min-w-0 items-center justify-end gap-3 sm:gap-6">
        {artistaSeleccionado && (
          <div className="hidden sm:flex min-w-0 flex-col items-end border-r border-zinc-200 pr-4">
            <span className="font-mono text-[9px] text-zinc-400 uppercase tracking-widest font-bold">
              Tatuador
            </span>
            <span className="max-w-36 truncate font-sans font-semibold text-xs text-zinc-800 uppercase mt-0.5">
              <SensitiveText>{artistaSeleccionado.nombreYApellidos.split(' ')[0]}</SensitiveText>
            </span>
          </div>
        )}

        <div className="flex shrink-0 flex-col items-end">
          <span className="font-mono text-[9px] text-zinc-400 uppercase tracking-widest font-bold leading-none">
            Progreso
          </span>
          <span className="font-sans text-xs font-bold text-zinc-800 mt-1 whitespace-nowrap">
            Paso {pasoActual} <span className="text-zinc-300 font-normal">/</span> {totalPasos}
          </span>
        </div>
      </div>
    </header>
  );
}
