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
    <header className="h-16 border-b border-zinc-200/80 flex items-center justify-between px-5 sm:px-8 bg-white select-none shrink-0 z-30 shadow-sm/5">
      <div className="flex flex-col items-start cursor-pointer group" onClick={onReset} title="Volver al inicio">
        <span className="font-sans font-black text-lg tracking-tight text-zinc-900 group-hover:text-zinc-700 transition-colors">
          VOD INK
        </span>
        <span className="font-mono text-[8px] uppercase tracking-widest text-zinc-400 font-bold leading-none mt-0.5">
          CANTABRIA • EST. 2024
        </span>
      </div>

      <div className="flex items-center gap-6">
        {artistaSeleccionado && (
          <div className="hidden sm:flex flex-col items-end border-r border-zinc-200 pr-4">
            <span className="font-mono text-[9px] text-zinc-400 uppercase tracking-widest font-bold">
              Tatuador
            </span>
            <span className="font-sans font-semibold text-xs text-zinc-800 uppercase mt-0.5">
              <SensitiveText>{artistaSeleccionado.nombreYApellidos.split(' ')[0]}</SensitiveText>
            </span>
          </div>
        )}

        <div className="flex flex-col items-end">
          <span className="font-mono text-[9px] text-zinc-400 uppercase tracking-widest font-bold leading-none">
            Progreso
          </span>
          <span className="font-sans text-xs font-bold text-zinc-800 mt-1">
            Paso {pasoActual} <span className="text-zinc-300 font-normal">/</span> {totalPasos}
          </span>
        </div>
      </div>
    </header>
  );
}
