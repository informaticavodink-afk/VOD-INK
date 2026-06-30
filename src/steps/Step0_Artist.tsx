/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ARTISTAS_VOD_INK } from '../lib/config';
import { Aplicador } from '../types';
import { Shield, User } from 'lucide-react';

interface Step0ArtistProps {
  artistaSeleccionado: Aplicador | null;
  onSelect: (artista: Aplicador) => void;
}

export default function Step0Artist({ artistaSeleccionado, onSelect }: Step0ArtistProps) {
  return (
    <div className="flex-1 flex flex-col justify-center overflow-y-auto p-6 sm:p-8 select-none bg-zinc-50/50">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div className="text-center space-y-1">
          <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-400 font-bold">
            Paso Inicial
          </span>
          <h2 className="font-sans font-extrabold text-2xl text-zinc-950 tracking-tight">
            Selecciona tu Artista
          </h2>
          <p className="font-sans text-xs text-zinc-500">
            Elige el aplicador oficial responsable de tu intervención sanitaria reglada
          </p>
        </div>

        {/* Bento Grid layout for Artists */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {ARTISTAS_VOD_INK.map((artista) => {
            const isSelected = artistaSeleccionado?.id === artista.id;
            return (
              <button
                key={artista.id}
                type="button"
                onClick={() => onSelect(artista)}
                className={`bento-card text-left p-5 cursor-pointer flex flex-col justify-between h-44 relative overflow-hidden group transition-all duration-300 ${
                  isSelected
                    ? 'border-zinc-950 border-2 bg-zinc-50/80 text-zinc-950 ring-2 ring-zinc-950 ring-offset-2 shadow-sm'
                    : 'bg-white border border-zinc-200 text-zinc-900 hover:border-zinc-300 hover:shadow-sm'
                }`}
                id={`artist-select-${artista.id}`}
              >
                <div className="space-y-4 w-full">
                  {/* Profile Indicator */}
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                        isSelected ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      <User className="w-5 h-5" />
                    </div>

                    {/* Radio-like circle indicator */}
                    <div
                      className={`w-5 h-5 rounded-full border transition-colors flex items-center justify-center ${
                        isSelected ? 'border-zinc-950 bg-white' : 'border-zinc-300 bg-white'
                      }`}
                    >
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-zinc-950 animate-scaleIn" />}
                    </div>
                  </div>

                  <div>
                    <h3 className={`font-sans font-bold text-sm tracking-tight ${
                      isSelected ? 'underline decoration-zinc-950 decoration-2 underline-offset-4' : ''
                    }`}>
                      {artista.nombreYApellidos}
                    </h3>
                    <p
                      className={`font-mono text-[10px] mt-1 uppercase tracking-wider font-semibold ${
                        isSelected ? 'text-zinc-600' : 'text-zinc-400'
                      }`}
                    >
                      {artista.titulacion}
                    </p>
                  </div>
                </div>

                {/* Subtle highlight bar on select */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 transition-all duration-300 ${
                  isSelected ? 'bg-zinc-950' : 'bg-transparent group-hover:bg-zinc-200'
                }`} />
              </button>
            );
          })}
        </div>

        {/* Security / Legal disclaimer styled as a bento item */}
        <div className="bento-card bg-white p-5 flex gap-4 items-start border border-zinc-200">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700 shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <span className="font-sans font-bold text-xs text-zinc-900 uppercase tracking-tight">
              Garantía Sanitaria Oficial
            </span>
            <p className="font-sans text-[11px] text-zinc-500 leading-relaxed text-justify">
              Conforme al Decreto 72/2006 de Cantabria, todos nuestros aplicadores disponen de la homologación oficial correspondiente para la práctica segura de artes corporales en Santander.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
