/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { LEGAL_SECTIONS } from '../lib/legalTexts';
import { AlertCircle, Activity, HeartCrack, HelpCircle, Check, CheckCircle2 } from 'lucide-react';

interface Step4ContraindicationsProps {
  declaracionContraindicaciones: boolean;
  declaracionSaludSeleccionadas: string[];
  onUpdate: (data: { declaracionContraindicaciones: boolean; declaracionSaludSeleccionadas: string[] }) => void;
  triggerValidationRef: React.MutableRefHandle<(() => Promise<boolean>) | null>;
}

export default function Step4Contraindications({
  declaracionContraindicaciones,
  declaracionSaludSeleccionadas,
  onUpdate,
  triggerValidationRef,
}: Step4ContraindicationsProps) {
  const [checked, setChecked] = useState(declaracionContraindicaciones);
  const [selectedConditions, setSelectedConditions] = useState<string[]>(declaracionSaludSeleccionadas);

  const handleToggle = () => {
    const nextVal = !checked;
    setChecked(nextVal);
    onUpdate({
      declaracionContraindicaciones: nextVal,
      declaracionSaludSeleccionadas: selectedConditions,
    });
  };

  // Expose validation to parent
  useEffect(() => {
    triggerValidationRef.current = async () => {
      onUpdate({
        declaracionContraindicaciones: checked,
        declaracionSaludSeleccionadas: selectedConditions,
      });
      return checked;
    };

    return () => {
      triggerValidationRef.current = null;
    };
  }, [checked, selectedConditions, onUpdate, triggerValidationRef]);

  const handleToggleCondition = (condition: string) => {
    let nextConditions;
    if (selectedConditions.includes(condition)) {
      nextConditions = selectedConditions.filter((c) => c !== condition);
    } else {
      nextConditions = [...selectedConditions, condition];
    }
    setSelectedConditions(nextConditions);
    onUpdate({
      declaracionContraindicaciones: checked,
      declaracionSaludSeleccionadas: nextConditions,
    });
  };

  const hasAnySelected = selectedConditions.length > 0;

  return (
    <div className="flex-1 flex flex-col justify-between bg-zinc-50/50 select-none p-6 sm:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        
        {/* Step Header */}
        <div className="text-center space-y-1">
          <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-400 font-bold">
            Salud & Aptitud
          </span>
          <h2 className="font-sans font-extrabold text-2xl text-zinc-950 tracking-tight">
            Declaración de Salud
          </h2>
          <p className="font-sans text-xs text-zinc-500">
            Informa al estudio si presentas alguna contraindicación médica o situación fisiológica especial
          </p>
        </div>

        {/* Bento Document Container */}
        <div className="bento-card bg-white p-6 space-y-6 max-h-[calc(100dvh-19rem)] overflow-y-auto">
          <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100">
            <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0" />
            <span className="font-sans font-bold text-[10px] tracking-wider text-zinc-500 uppercase leading-tight">
              Selecciona las casillas correspondientes si padece alguna condición:
            </span>
          </div>

          {/* List 1: Temporales */}
          <div className="space-y-3">
            <h3 className="font-sans font-bold text-zinc-800 text-xs uppercase tracking-wider flex items-center gap-2 pb-1.5 border-b border-zinc-100">
              <Activity className="w-4 h-4 text-zinc-500 shrink-0" />
              1. Contraindicaciones Temporales
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LEGAL_SECTIONS.seccionJ.listaTemporal.map((condition, idx) => {
                const isSelected = selectedConditions.includes(condition);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleToggleCondition(condition)}
                    className={`text-left p-3 border rounded-xl font-sans text-xs transition-all duration-200 cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-zinc-900 bg-zinc-50 font-semibold text-zinc-950'
                        : 'border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 text-zinc-600'
                    }`}
                  >
                    <span className="leading-snug pr-2">{condition}</span>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ml-1.5 ${
                      isSelected ? 'border-zinc-900 bg-zinc-950 text-white' : 'border-zinc-300 bg-white'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* List 2: Supervisión Médica */}
          <div className="space-y-3">
            <h3 className="font-sans font-bold text-zinc-800 text-xs uppercase tracking-wider flex items-center gap-2 pb-1.5 border-b border-zinc-100">
              <HelpCircle className="w-4 h-4 text-zinc-500 shrink-0" />
              2. Situaciones bajo Supervisión Médica
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LEGAL_SECTIONS.seccionJ.listaMedica.map((condition, idx) => {
                const isSelected = selectedConditions.includes(condition);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleToggleCondition(condition)}
                    className={`text-left p-3 border rounded-xl font-sans text-xs transition-all duration-200 cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-zinc-900 bg-zinc-50 font-semibold text-zinc-950'
                        : 'border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 text-zinc-600'
                    }`}
                  >
                    <span className="leading-snug pr-2">{condition}</span>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ml-1.5 ${
                      isSelected ? 'border-zinc-900 bg-zinc-950 text-white' : 'border-zinc-300 bg-white'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* List 3: Definitivas */}
          <div className="space-y-3">
            <h3 className="font-sans font-bold text-red-700 text-xs uppercase tracking-wider flex items-center gap-2 pb-1.5 border-b border-red-100">
              <HeartCrack className="w-4 h-4 text-red-500 shrink-0" />
              3. Contraindicaciones Definitivas (Absolutas)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LEGAL_SECTIONS.seccionJ.listaDefinitiva.map((condition, idx) => {
                const isSelected = selectedConditions.includes(condition);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleToggleCondition(condition)}
                    className={`text-left p-3 border rounded-xl font-sans text-xs transition-all duration-200 cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-red-300 bg-red-50/70 font-semibold text-red-900 shadow-sm'
                        : 'border-zinc-200 bg-white hover:bg-red-50/30 hover:border-red-200 text-zinc-600'
                    }`}
                  >
                    <span className="leading-snug pr-2">{condition}</span>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ml-1.5 ${
                      isSelected ? 'border-red-600 bg-red-600 text-white' : 'border-zinc-300 bg-white'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Warning if any health issues were checked (Highly polished, warm and legible banner) */}
        {hasAnySelected && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-900 animate-fadeIn items-start">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-sans font-bold text-xs uppercase tracking-tight block">
                Atención Sanitaria Requerida
              </span>
              <p className="font-sans text-xs text-amber-800 leading-relaxed">
                Has marcado <strong>{selectedConditions.length} antecedentes médicos</strong>. El tatuador asignado revisará detalladamente estos puntos contigo en la cabina antes del tratamiento para garantizar la total seguridad higiénico-sanitaria de la intervención.
              </p>
            </div>
          </div>
        )}

        {/* Final legal checkbox declaration */}
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
              Declaro mi aptitud física bajo mi responsabilidad
            </span>
            <p className={`font-sans text-[11px] leading-normal ${
              checked ? 'text-zinc-600' : 'text-zinc-500'
            }`}>
              Declaro no encontrarme bajo ninguna situación absoluta excluyente, o bien he reseñado mis antecedentes en la parte superior para una práctica supervisada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
