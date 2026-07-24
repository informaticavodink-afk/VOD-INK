/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Sliders, Palette, Info, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { TechniqueSchema } from '../../lib/schema';
import { Tecnica } from '../../types';
import SensitiveText from '../SensitiveText';
import DatePicker from '../DatePicker';
import SignaturePad from '../SignaturePad';

interface InterventionModalProps {
  isOpen: boolean;
  onClose: () => void;
  consent: any; // ConsentWithStudio
  artist: any; // Perfil del artista firmante
  onSave: (techniqueData: Tecnica, signature: string) => Promise<void>;
  isSaving: boolean;
  error?: string | null;
}

export default function InterventionModal({
  isOpen,
  onClose,
  consent,
  artist,
  onSave,
  isSaving,
  error,
}: InterventionModalProps) {
  const existingTechnique = consent?.technique_data as Tecnica | undefined;

  const healthFlags = useMemo(
    () =>
      Array.isArray(consent?.health_flags)
        ? consent.health_flags.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
        : [],
    [consent]
  );

  const [artistSignature, setArtistSignature] = useState('');
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [healthAcknowledged, setHealthAcknowledged] = useState(false);
  const [healthAckError, setHealthAckError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Tecnica>({
    resolver: zodResolver(TechniqueSchema),
    defaultValues: {
      denominacionGenerica: existingTechnique?.denominacionGenerica || '',
      localizacionAnatomica: existingTechnique?.localizacionAnatomica || '',
      tintas: existingTechnique?.tintas && existingTechnique.tintas.length > 0
        ? existingTechnique.tintas
        : [{ nombre: '', numRegistroAEMPS: '', lote: '', caducidad: '' }],
      otrosMateriales: existingTechnique?.otrosMateriales || '',
      duracion: existingTechnique?.duracion || '',
      posibilidadesEliminacion: existingTechnique?.posibilidadesEliminacion || '',
      presupuesto: existingTechnique?.presupuesto || '',
    },
    mode: 'onTouched',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tintas',
  });

  useEffect(() => {
    if (!isOpen) return;

    reset({
      denominacionGenerica: existingTechnique?.denominacionGenerica || '',
      localizacionAnatomica: existingTechnique?.localizacionAnatomica || '',
      tintas: existingTechnique?.tintas?.length
        ? existingTechnique.tintas
        : [{ nombre: '', numRegistroAEMPS: '', lote: '', caducidad: '' }],
      otrosMateriales: existingTechnique?.otrosMateriales || '',
      duracion: existingTechnique?.duracion || '',
      posibilidadesEliminacion: existingTechnique?.posibilidadesEliminacion || '',
      presupuesto: existingTechnique?.presupuesto || '',
    });
    setArtistSignature('');
    setSignatureError(null);
    setHealthAcknowledged(false);
    setHealthAckError(null);
  }, [consent?.id, existingTechnique, isOpen, reset]);

  const handleAddBlankInk = () => {
    append({
      nombre: '',
      numRegistroAEMPS: '',
      lote: '',
      caducidad: '',
    });
  };

  const onSubmitForm = async (data: Tecnica) => {
    if (healthFlags.length > 0 && !healthAcknowledged) {
      setHealthAckError('Debes confirmar que revisaste los antecedentes de salud con el cliente.');
      return;
    }
    setHealthAckError(null);

    if (!artistSignature) {
      setSignatureError('La firma del profesional es obligatoria');
      return;
    }
    setSignatureError(null);
    await onSave(data, artistSignature);
  };

  if (!isOpen || !consent) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-[32px] max-w-4xl w-full max-h-[90vh] border border-zinc-100 shadow-2xl flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center shrink-0">
          <div className="space-y-0.5 text-left">
            <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-400 font-bold block">
              Fase de Intervención
            </span>
            <h3 className="font-sans font-extrabold text-xl text-zinc-950 tracking-tight">
              Registrar Técnica & Materiales
            </h3>
            <p className="font-sans text-xs text-zinc-500">
              Cliente: <strong className="text-zinc-800"><SensitiveText>{consent.client_full_name}</SensitiveText></strong> | DNI: <strong className="text-zinc-800"><SensitiveText>{consent.client_dni}</SensitiveText></strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer p-1.5 rounded-xl hover:bg-zinc-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form Scrollable */}
        <form onSubmit={handleSubmit(onSubmitForm)} className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/50">
          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            
            {/* Bento Card 1: Procedure Details (2 Cols) */}
            <div className="bento-card bg-white p-6 md:col-span-2 space-y-4 rounded-2xl border border-zinc-200/60 shadow-sm">
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
                    className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 bg-white"
                  >
                    <option value="">Seleccionar técnica</option>
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
                    className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 bg-white"
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
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 bg-white"
                />
                {errors.otrosMateriales && (
                  <span className="text-red-600 font-sans text-[10px] block mt-1">{errors.otrosMateriales.message}</span>
                )}
              </div>
            </div>

            {/* Bento Card 2: Cost & Estimations (1 Col) */}
            <div className="bento-card bg-white p-6 md:col-span-1 flex flex-col justify-between space-y-4 rounded-2xl border border-zinc-200/60 shadow-sm">
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
                    className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 bg-white font-sans font-bold text-zinc-900"
                  />
                  {errors.presupuesto && (
                    <span className="text-red-600 font-sans text-[10px] block mt-1">{errors.presupuesto.message}</span>
                  )}
                </div>

                <div className="space-y-1">
                  <label htmlFor="intervention-duration" className="font-sans font-semibold text-zinc-500 text-[10px] uppercase tracking-wider block">
                    Duración en el tiempo
                  </label>
                  <input
                    id="intervention-duration"
                    type="text"
                    {...register('duracion')}
                    aria-invalid={Boolean(errors.duracion)}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 bg-white"
                  />
                  {errors.duracion && (
                    <span className="text-red-600 font-sans text-[10px] block mt-1" role="alert">{errors.duracion.message}</span>
                  )}
                </div>

                <div className="space-y-1">
                  <label htmlFor="intervention-removal" className="font-sans font-semibold text-zinc-500 text-[10px] uppercase tracking-wider block">
                    Posibilidades de eliminación
                  </label>
                  <input
                    id="intervention-removal"
                    type="text"
                    {...register('posibilidadesEliminacion')}
                    aria-invalid={Boolean(errors.posibilidadesEliminacion)}
                    placeholder="ej. Tratamiento láser especializado"
                    className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 bg-white"
                  />
                  {errors.posibilidadesEliminacion && (
                    <span className="text-red-600 font-sans text-[10px] block mt-1" role="alert">{errors.posibilidadesEliminacion.message}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Bento Card 3: Inks & Pigments (Takes all 3 columns) */}
            <div className="bento-card bg-white p-6 md:col-span-3 space-y-5 rounded-2xl border border-zinc-200/60 shadow-sm">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-zinc-400" />
                  <span className="font-sans font-bold text-xs text-zinc-900 uppercase tracking-wider">
                    Tintas
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddBlankInk}
                  className="border border-zinc-200 hover:border-zinc-900 rounded-xl px-3 py-1.5 bg-white hover:bg-zinc-50 font-sans text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 text-zinc-800"
                >
                  <Plus className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-950" />
                  Añadir tinta
                </button>
              </div>

              {/* Dynamic Ink fields list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="border border-zinc-100 rounded-xl p-4 bg-zinc-50/50 space-y-3 relative transition-all hover:bg-zinc-50 text-left">
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
                        className="w-full rounded-xl border border-zinc-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950 bg-white"
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
                          className="w-full rounded-xl border border-zinc-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950 bg-white font-mono"
                        />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className="font-sans font-semibold text-zinc-500 text-[9px] uppercase tracking-wider block">Lote</label>
                        <input
                          type="text"
                          {...register(`tintas.${index}.lote` as const)}
                          className="w-full rounded-xl border border-zinc-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950 bg-white font-mono"
                        />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className="font-sans font-semibold text-zinc-500 text-[9px] uppercase tracking-wider block">Caducidad</label>
                        <Controller
                          control={control}
                          name={`tintas.${index}.caducidad` as const}
                          render={({ field }) => (
                            <DatePicker
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Seleccionar"
                              futureYears={true}
                              error={errors.tintas?.[index]?.caducidad?.message}
                            />
                          )}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Certificación Higiénico-Sanitaria & Firma */}
          <div className="border-t border-zinc-100 pt-6 space-y-4 text-left">
            <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-400 font-bold block">
              Certificación Higiénico-Sanitaria & Firma
            </span>

            {healthFlags.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3 animate-fadeIn">
                <div className="flex items-start gap-3 text-amber-900">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-sans font-bold text-xs uppercase tracking-tight block">
                      Antecedentes de Salud Declarados
                    </span>
                    <p className="font-sans text-xs text-amber-800 leading-relaxed">
                      El cliente ha declarado los siguientes antecedentes. Revísalos con él/ella antes de continuar con la intervención.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pl-8">
                  {healthFlags.map((flag) => (
                    <span
                      key={flag}
                      className="inline-flex rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-semibold text-amber-900"
                    >
                      <SensitiveText>{flag}</SensitiveText>
                    </span>
                  ))}
                </div>

                <div
                  role="checkbox"
                  aria-checked={healthAcknowledged}
                  tabIndex={0}
                  onClick={() => {
                    setHealthAcknowledged((prev) => !prev);
                    setHealthAckError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setHealthAcknowledged((prev) => !prev);
                      setHealthAckError(null);
                    }
                  }}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
                    healthAcknowledged
                      ? 'bg-white border-amber-400 ring-1 ring-amber-400'
                      : 'bg-white/60 border-amber-200'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200 ${
                      healthAcknowledged ? 'border-amber-600 bg-amber-600 text-white' : 'border-amber-300 bg-white text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                  <span className="font-sans text-xs font-semibold text-amber-900 leading-snug">
                    He revisado estos antecedentes con el cliente y confirmo que es seguro proceder.
                  </span>
                </div>

                {healthAckError && (
                  <span className="text-red-600 font-sans text-xs block font-medium pl-8">
                    {healthAckError}
                  </span>
                )}
              </div>
            )}

            <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-[11px] text-zinc-500 leading-relaxed text-justify space-y-2">
              <p>
                Yo, <strong className="text-zinc-950 font-bold">{artist?.full_name || 'El Técnico Aplicador'}</strong>, con DNI/NIE <strong className="text-zinc-950 font-semibold">{artist?.dni || 'N/A'}</strong> y cualificación <strong className="text-zinc-950 font-semibold">{artist?.qualification || 'Técnico Homologado'}</strong>, certifico bajo su estricta responsabilidad que se han cumplido de forma escrupulosa las medidas higiénicas reguladas por el Decreto 72/2006 de Cantabria.
              </p>
              <p className="text-[10px] text-zinc-400">
                Confirma haber verificado fehacientemente la identidad de la persona usuaria y el desembalaje de boquillas y agujas estériles desechables en su presencia directa.
              </p>
            </div>

            <div className="h-[200px] flex flex-col justify-center border border-zinc-200 rounded-2xl overflow-hidden bg-white">
              <SignaturePad
                id="artist-signature-pad-modal"
                placeholderText={`Firma del Tatuador: ${artist?.full_name || 'Aplicador'}`}
                initialDataUrl={artistSignature}
                onSave={(dataUrl) => {
                  setArtistSignature(dataUrl);
                  setSignatureError(null);
                }}
                onClear={() => setArtistSignature('')}
              />
            </div>

            {signatureError && (
              <span className="text-red-600 font-sans text-xs block mt-1 font-medium">
                {signatureError}
              </span>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-xs p-3 rounded-xl text-left">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-zinc-100 flex gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 text-xs font-bold text-zinc-700 bg-white hover:bg-zinc-50 active:bg-zinc-100 rounded-xl transition-all cursor-pointer border border-zinc-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || (healthFlags.length > 0 && !healthAcknowledged)}
              className="flex-1 py-3.5 text-xs font-extrabold uppercase tracking-wider text-white bg-zinc-950 hover:bg-zinc-800 active:bg-zinc-900 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  Guardando y firmando...
                </>
              ) : (
                <>
                  <Check className="w-4.5 h-4.5 stroke-[2.5]" />
                  Confirmar y Firmar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
