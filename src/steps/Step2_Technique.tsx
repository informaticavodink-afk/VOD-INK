/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TechniqueSchema } from '../lib/schema';
import { Tecnica } from '../types';
import { TINTAS_PREDEFINIDAS } from '../lib/config';
import { Plus, Trash2, Sliders, Palette, Info } from 'lucide-react';

interface Step2TechniqueProps {
  datosTecnica: Tecnica;
  onUpdate: (data: Tecnica) => void;
  triggerValidationRef: React.MutableRefHandle<(() => Promise<boolean>) | null>;
  saveStateRef: React.MutableRefHandle<(() => void) | null>;
}

export default function Step2Technique({
  datosTecnica,
  onUpdate,
  triggerValidationRef,
  saveStateRef,
}: Step2TechniqueProps) {
  const {
    register,
    control,
    trigger,
    watch,
    getValues,
    formState: { errors },
  } = useForm<Tecnica>({
    resolver: zodResolver(TechniqueSchema),
    defaultValues: {
      ...datosTecnica,
      tintas: datosTecnica.tintas,
      duracion: datosTecnica.duracion || 'indefinido',
      posibilidadesEliminacion: datosTecnica.posibilidadesEliminacion || 'Láser Q-Switched / Dermoabrasión (parcial)',
      otrosMateriales: datosTecnica.otrosMateriales || 'Agujas estériles de un solo uso, grip desechable, vaselina filante, film osmótico, jabón syndet.',
    },
    mode: 'onTouched',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tintas',
  });

  // Register saveStateRef to save values on demand (e.g. on navigation)
  useEffect(() => {
    saveStateRef.current = () => {
      onUpdate(getValues());
    };

    return () => {
      saveStateRef.current = null;
    };
  }, [getValues, onUpdate, saveStateRef]);

  // Expose validation to parent and sync state
  useEffect(() => {
    triggerValidationRef.current = async () => {
      const isValid = await trigger();
      onUpdate(getValues());
      return isValid;
    };

    return () => {
      triggerValidationRef.current = null;
    };
  }, [trigger, getValues, onUpdate, triggerValidationRef]);

  const handleAddPredefinedInk = (ink: typeof TINTAS_PREDEFINIDAS[0]) => {
    append({
      nombre: ink.nombre,
      numRegistroAEMPS: ink.numRegistroAEMPS,
      lote: ink.lote + '-' + new Date().getFullYear().toString().slice(-2),
      caducidad: ink.caducidad,
    });
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-zinc-50/50 select-none p-6 sm:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        
        {/* Step Header */}
        <div className="text-center space-y-1">
          <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-400 font-bold">
            Intervención
          </span>
          <h2 className="font-sans font-extrabold text-2xl text-zinc-950 tracking-tight">
            Técnica & Materiales
          </h2>
          <p className="font-sans text-xs text-zinc-500">
            Define la denominación anatómica, tintas de implantación y presupuesto del procedimiento
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Bento Card 1: Procedure Details (2 Cols) */}
          <div className="bento-card bg-white p-6 md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
              <Sliders className="w-4 h-4 text-zinc-400" />
              <span className="font-sans font-bold text-xs text-zinc-900 uppercase tracking-wider">
                Detalle de la Intervención
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-sans font-semibold text-zinc-500 text-[10px] uppercase tracking-wider block">
                  Denominación Genérica
                </label>
                <select
                  {...register('denominacionGenerica')}
                  className="w-full"
                >
                  <option value="Tatuaje">Tatuaje artístico</option>
                  <option value="Micropigmentación">Micropigmentación</option>
                  <option value="Piercing">Piercing / Perforación</option>
                </select>
                {errors.denominacionGenerica && (
                  <span className="text-red-600 font-sans text-[10px] block mt-1">{errors.denominacionGenerica.message}</span>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-sans font-semibold text-zinc-500 text-[10px] uppercase tracking-wider block">
                  Localización Anatómica
                </label>
                <input
                  type="text"
                  {...register('localizacionAnatomica')}
                  placeholder="ej. Antebrazo izquierdo"
                  className="w-full"
                />
                {errors.localizacionAnatomica && (
                  <span className="text-red-600 font-sans text-[10px] block mt-1">{errors.localizacionAnatomica.message}</span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-sans font-semibold text-zinc-500 text-[10px] uppercase tracking-wider block">
                Otros materiales habituales
              </label>
              <textarea
                {...register('otrosMateriales')}
                rows={2}
                className="w-full"
              />
              {errors.otrosMateriales && (
                <span className="text-red-600 font-sans text-[10px] block mt-1">{errors.otrosMateriales.message}</span>
              )}
            </div>
          </div>

          {/* Bento Card 2: Cost & Estimations (1 Col) */}
          <div className="bento-card bg-white p-6 md:col-span-1 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
                <Info className="w-4 h-4 text-zinc-400" />
                <span className="font-sans font-bold text-xs text-zinc-900 uppercase tracking-wider">
                  Coste & Duración
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-sans font-semibold text-zinc-500 text-[10px] uppercase tracking-wider block">
                  Presupuesto (€)
                </label>
                <input
                  type="text"
                  {...register('presupuesto')}
                  placeholder="ej. 150"
                  className="w-full font-sans font-bold text-zinc-900"
                />
                {errors.presupuesto && (
                  <span className="text-red-600 font-sans text-[10px] block mt-1">{errors.presupuesto.message}</span>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-sans font-semibold text-zinc-500 text-[10px] uppercase tracking-wider block">
                  Duración en el tiempo
                </label>
                <input
                  type="text"
                  {...register('duracion')}
                  className="w-full"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 space-y-1">
              <label className="font-sans font-semibold text-zinc-400 text-[9px] uppercase tracking-wider block">
                Eliminación de referencia
              </label>
              <span className="text-[11px] text-zinc-500 block leading-tight">
                Láser Q-Switched / Dermoabrasión (parcial)
              </span>
            </div>
          </div>

          {/* Bento Card 3: Inks & Pigments (Takes all 3 columns) */}
          <div className="bento-card bg-white p-6 md:col-span-3 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-zinc-400" />
                <span className="font-sans font-bold text-xs text-zinc-900 uppercase tracking-wider">
                  Productos de Implantación (Tintas Autorizadas AEMPS)
                </span>
              </div>
              <span className="text-[9px] font-mono font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200 uppercase">
                Decreto Cantabria 72/2006
              </span>
            </div>

            {/* Predefined Ink Selectors styled as minimalist micro-actions */}
            <div className="space-y-2">
              <span className="font-sans font-semibold text-zinc-500 text-[10px] uppercase tracking-wider block">
                Autocompletar Tintas Oficiales del Estudio
              </span>
              <div className="flex flex-wrap gap-2">
                {TINTAS_PREDEFINIDAS.map((ink, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddPredefinedInk(ink)}
                    className="border border-zinc-200 hover:border-zinc-900 rounded-xl px-3 py-1.5 bg-white hover:bg-zinc-50 font-sans text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 text-zinc-800"
                  >
                    <Plus className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-950" />
                    {ink.nombre.replace('Ink ', '').replace('World Famous ', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Ink fields list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {fields.map((field, index) => (
                <div key={field.id} className="border border-zinc-100 rounded-xl p-4 bg-zinc-50/50 space-y-3 relative transition-all hover:bg-zinc-50">
                  <div className="flex justify-between items-center border-b border-zinc-200/60 pb-2">
                    <span className="font-mono text-[10px] text-zinc-500 font-bold uppercase">
                      Tinta #{index + 1}
                    </span>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer p-1"
                        title="Eliminar tinta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="font-sans font-semibold text-zinc-500 text-[9px] uppercase tracking-wider block">
                      Nombre comercial
                    </label>
                    <input
                      type="text"
                      {...register(`tintas.${index}.nombre` as const)}
                      className="w-full !p-2 !text-xs"
                    />
                    {errors.tintas?.[index]?.nombre && (
                      <span className="text-red-600 font-sans text-[9px] block mt-0.5 font-medium">
                        {errors.tintas[index]?.nombre?.message}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1 space-y-1">
                      <label className="font-sans font-semibold text-zinc-500 text-[9px] uppercase tracking-wider block">Nº AEMPS</label>
                      <input
                        type="text"
                        {...register(`tintas.${index}.numRegistroAEMPS` as const)}
                        className="w-full !p-2 !text-xs font-mono"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="font-sans font-semibold text-zinc-500 text-[9px] uppercase tracking-wider block">Lote</label>
                      <input
                        type="text"
                        {...register(`tintas.${index}.lote` as const)}
                        className="w-full !p-2 !text-xs font-mono"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="font-sans font-semibold text-zinc-500 text-[9px] uppercase tracking-wider block">Caducidad</label>
                      <input
                        type="text"
                        {...register(`tintas.${index}.caducidad` as const)}
                        className="w-full !p-2 !text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
