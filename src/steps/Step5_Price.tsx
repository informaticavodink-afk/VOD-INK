/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Tecnica } from '../types';
import { Euro, CalendarClock, Trash2, Check, FileSpreadsheet } from 'lucide-react';

interface Step5PriceProps {
  datosTecnica: Tecnica;
  confirmadoPrecio: boolean;
  onUpdate: (confirmadoPrecio: boolean) => void;
  triggerValidationRef: React.MutableRefHandle<(() => Promise<boolean>) | null>;
}

export default function Step5Price({
  datosTecnica,
  confirmadoPrecio,
  onUpdate,
  triggerValidationRef,
}: Step5PriceProps) {
  const [checked, setChecked] = useState(confirmadoPrecio);

  const handleToggle = () => {
    const nextVal = !checked;
    setChecked(nextVal);
    onUpdate(nextVal);
  };

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
            Finanzas & Permanencia
          </span>
          <h2 className="font-sans font-extrabold text-2xl text-zinc-950 tracking-tight">
            Presupuesto & Condiciones
          </h2>
          <p className="font-sans text-xs text-zinc-500">
            Confirma la valoración económica final y las condiciones de mantenimiento e irreversibilidad del tratamiento
          </p>
        </div>

        {/* Outer scroll box for content */}
        <div className="space-y-4">
          
          {/* Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Bento Card 1: Budget */}
            <div className="bento-card bg-white p-5 flex flex-col justify-between min-h-[140px] relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-400">Presupuesto</span>
                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
                  <Euro className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="font-sans font-black text-2xl tracking-tight text-zinc-950 block">
                  {datosTecnica.presupuesto ? `${datosTecnica.presupuesto} €` : 'N/A'}
                </span>
                <span className="font-sans text-[10px] text-zinc-400 mt-1 block leading-none">Impuestos incluidos</span>
              </div>
            </div>

            {/* Bento Card 2: Duration */}
            <div className="bento-card bg-white p-5 flex flex-col justify-between min-h-[140px] relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-400">Duración</span>
                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
                  <CalendarClock className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="font-sans font-bold text-base tracking-tight text-zinc-800 block">
                  {datosTecnica.duracion || 'N/A'}
                </span>
                <span className="font-sans text-[10px] text-zinc-400 mt-1 block leading-none">Sesión estimada</span>
              </div>
            </div>

            {/* Bento Card 3: Removal */}
            <div className="bento-card bg-white p-5 flex flex-col justify-between min-h-[140px] relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="font-sans font-bold text-[10px] uppercase tracking-wider text-zinc-400">Permanencia</span>
                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
                  <Trash2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="font-sans font-semibold text-xs leading-normal text-zinc-700 block line-clamp-2">
                  {datosTecnica.posibilidadesEliminacion || 'N/A'}
                </span>
                <span className="font-sans text-[10px] text-zinc-400 mt-1 block leading-none">Información de corrección</span>
              </div>
            </div>
          </div>

          {/* Detailed conditions terms block */}
          <div className="bento-card bg-white p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
              <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
              <span className="font-sans font-bold text-xs text-zinc-900 uppercase tracking-wider">
                Cláusulas Financieras y de Mantenimiento (Normas D, E, K)
              </span>
            </div>
            
            <div className="font-sans text-[11px] text-zinc-500 space-y-3.5 leading-relaxed text-justify">
              <p>
                <strong className="text-zinc-800 font-bold">Sección D — Duración:</strong> Se estima un tiempo máximo reflejado arriba. Si por cuestiones fisiológicas o decisión del usuario se requiriesen sesiones adicionales, se especificará un nuevo presupuesto complementario.
              </p>
              <p>
                <strong className="text-zinc-800 font-bold">Sección E — Eliminación:</strong> Se informa expresamente al usuario que las técnicas de micropigmentación o tatuaje tienen carácter permanente. Su eliminación total o parcial no es sencilla y habitualmente requiere tratamientos láser costosos, dermoabrasión o cirugía, sin garantía absoluta de restauración epidérmica perfecta.
              </p>
              <p>
                <strong className="text-zinc-800 font-bold">Sección K — Presupuesto:</strong> El importe arriba consignado cubre íntegramente la sesión detallada, agujas, tintas homologadas y el servicio profesional del aplicador. El cliente se compromete al abono de dicho importe en el estudio al concluir el tratamiento.
              </p>
            </div>
          </div>
        </div>

        {/* Checkbox acceptance bento card */}
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
              Acepto el presupuesto y las condiciones informadas
            </span>
            <p className={`font-sans text-[11px] leading-normal ${
              checked ? 'text-zinc-600' : 'text-zinc-500'
            }`}>
              Otorgo mi total conformidad con los costes descritos y entiendo perfectamente las limitaciones técnicas para la eliminación del tatuaje.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
