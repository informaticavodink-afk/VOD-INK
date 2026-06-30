/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { LEGAL_SECTIONS } from '../lib/legalTexts';
import { BookOpen, Check, FileText } from 'lucide-react';

interface Step3LegalProps {
  declaracionLeido: boolean;
  onUpdate: (declaracionLeido: boolean) => void;
  triggerValidationRef: React.MutableRefHandle<(() => Promise<boolean>) | null>;
}

export default function Step3Legal({
  declaracionLeido,
  onUpdate,
  triggerValidationRef,
}: Step3LegalProps) {
  const [checked, setChecked] = useState(declaracionLeido);

  const handleToggle = () => {
    const nextVal = !checked;
    setChecked(nextVal);
    onUpdate(nextVal);
  };

  // Expose validation to parent
  useEffect(() => {
    triggerValidationRef.current = async () => {
      onUpdate(checked);
      return checked;
    };

    return () => {
      triggerValidationRef.current = null;
    };
  }, [checked, onUpdate, triggerValidationRef]);

  return (
    <div className="flex-1 flex flex-col justify-between bg-zinc-50/50 select-none p-6 sm:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        
        {/* Step Header */}
        <div className="text-center space-y-1">
          <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-400 font-bold">
            Divulgación
          </span>
          <h2 className="font-sans font-extrabold text-2xl text-zinc-950 tracking-tight">
            Información Legal & Sanitaria
          </h2>
          <p className="font-sans text-xs text-zinc-500">
            Lee detenidamente las medidas higiénicas y los riesgos previstos por la normativa de Cantabria
          </p>
        </div>

        {/* Scrollable legal container (Beautiful Bento Document Reader) */}
        <div className="bento-card bg-white p-6 space-y-6 max-h-[calc(100dvh-18.5rem)] overflow-y-auto">
          {/* Header watermark */}
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
            <BookOpen className="w-4 h-4 text-zinc-400 shrink-0" />
            <span className="font-sans font-bold text-[10px] tracking-wider text-zinc-500 uppercase">
              DOCUMENTO OFICIAL DE DIVULGACIÓN SANITARIA
            </span>
          </div>

          {/* Section F */}
          <div className="space-y-2.5">
            <h3 className="font-sans font-bold uppercase text-zinc-900 text-xs tracking-tight border-l-2 border-zinc-900 pl-2.5">
              {LEGAL_SECTIONS.seccionF.titulo}
            </h3>
            <ul className="space-y-2 font-sans text-xs text-zinc-500 list-none pl-0 leading-relaxed text-justify">
              {LEGAL_SECTIONS.seccionF.contenido.map((para, i) => (
                <li key={i} className="relative pl-3.5">
                  <span className="absolute left-0 top-0 text-zinc-400 font-bold">•</span>
                  {para}
                </li>
              ))}
            </ul>
          </div>

          {/* Section G */}
          <div className="space-y-2.5">
            <h3 className="font-sans font-bold uppercase text-zinc-900 text-xs tracking-tight border-l-2 border-zinc-900 pl-2.5">
              {LEGAL_SECTIONS.seccionG.titulo}
            </h3>
            <ul className="space-y-2 font-sans text-xs text-zinc-500 list-none pl-0 leading-relaxed text-justify">
              {LEGAL_SECTIONS.seccionG.contenido.map((para, i) => (
                <li key={i} className="relative pl-3.5">
                  <span className="absolute left-0 top-0 text-zinc-400 font-bold">•</span>
                  {para}
                </li>
              ))}
            </ul>
          </div>

          {/* Section H */}
          <div className="space-y-2.5">
            <h3 className="font-sans font-bold uppercase text-zinc-900 text-xs tracking-tight border-l-2 border-zinc-900 pl-2.5">
              {LEGAL_SECTIONS.seccionH.titulo}
            </h3>
            <ul className="space-y-2 font-sans text-xs text-zinc-500 list-none pl-0 leading-relaxed text-justify">
              {LEGAL_SECTIONS.seccionH.contenido.map((para, i) => (
                <li key={i} className="relative pl-3.5">
                  <span className="absolute left-0 top-0 text-zinc-400 font-bold">•</span>
                  {para}
                </li>
              ))}
            </ul>
          </div>

          {/* Section I */}
          <div className="space-y-2.5">
            <h3 className="font-sans font-bold uppercase text-zinc-900 text-xs tracking-tight border-l-2 border-zinc-900 pl-2.5">
              {LEGAL_SECTIONS.seccionI.titulo}
            </h3>
            <ul className="space-y-2 font-sans text-xs text-zinc-500 list-none pl-0 leading-relaxed text-justify">
              {LEGAL_SECTIONS.seccionI.contenido.map((para, i) => (
                <li key={i} className="relative pl-3.5">
                  <span className="absolute left-0 top-0 text-zinc-400 font-bold">•</span>
                  {para}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Checkbox agreement bento card */}
        <div className={`bento-card p-5 flex items-start gap-4 select-none cursor-pointer transition-all duration-300 ${
          checked ? 'bg-zinc-50 border-zinc-950 ring-2 ring-zinc-950 text-zinc-950 shadow-sm' : 'bg-white border border-zinc-200 text-zinc-900'
        }`}
          onClick={handleToggle}
        >
          <button
            type="button"
            className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer transition-all duration-200 ${
              checked ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-300 bg-zinc-50 text-transparent'
            }`}
          >
            <Check className="w-4 h-4 stroke-[3]" />
          </button>
          <div className="flex-1 space-y-1">
            <span className={`font-sans font-bold text-xs leading-none uppercase tracking-wide block ${
              checked ? 'text-zinc-950 underline decoration-zinc-950 decoration-2 underline-offset-4' : 'text-zinc-900'
            }`}>
              He leído y comprendo las medidas higiénicas y los riesgos
            </span>
            <p className={`font-sans text-[11px] leading-normal ${
              checked ? 'text-zinc-600' : 'text-zinc-500'
            }`}>
              Confirmo que he recibido y asimilado plenamente las instrucciones sanitarias obligatorias previas al tatuaje.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
