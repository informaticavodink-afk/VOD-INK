/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClientSchema, RepresentanteSchema } from '../lib/schema';
import { calculateAge, isMinorOnConsentDate } from '../domain/consents/age';
import type { Cliente, RepresentanteLegal } from '../types';
import { ShieldAlert, User, AlertTriangle, FileText, ToggleLeft, ToggleRight } from 'lucide-react';
    import DatePicker from '../components/DatePicker';

const INITIAL_REPRESENTATIVE: RepresentanteLegal = {
  nombreYApellidos: '', dni: '', fechaNacimiento: '', domicilio: '', cp: '', localidad: '',
  telefono: '', parentesco: '', acreditaMediante: '',
};

interface Step1ClientProps {
  datosCliente: Cliente;
  datosRepresentante: RepresentanteLegal;
  esMenor: boolean;
  tieneRepresentanteLegal: boolean;
  onUpdate: (data: { datosCliente: Cliente; datosRepresentante: RepresentanteLegal; esMenor: boolean; tieneRepresentanteLegal: boolean }) => void;
  triggerValidationRef: React.MutableRefHandle<(() => Promise<boolean>) | null>;
  saveStateRef: React.MutableRefHandle<(() => void) | null>;
}

export default function Step1Client({
  datosCliente,
  datosRepresentante,
  esMenor: initialEsMenor,
  tieneRepresentanteLegal: initialTieneRepresentanteLegal,
  onUpdate,
  triggerValidationRef,
  saveStateRef,
  }: Step1ClientProps) {


  // Client form
  const {
    register: regClient,
    watch: watchClient,
    formState: { errors: clientErrors },
    trigger: triggerClient,
    getValues: getClientValues,
    setValue: setClientValue,
  } = useForm<Cliente>({
    resolver: zodResolver(ClientSchema),
    defaultValues: datosCliente,
    mode: 'onTouched',
  });

  // Representative form
  const {
    register: regRep,
    formState: { errors: repErrors },
    trigger: triggerRep,
    getValues: getRepValues,
    watch: watchRep,
    setValue: setRepValue,
    reset: resetRep,
  } = useForm<RepresentanteLegal>({
    resolver: zodResolver(RepresentanteSchema),
    defaultValues: datosRepresentante,
    mode: 'onTouched',
  });

  const watchFechaNacimiento = watchClient('fechaNacimiento');
  const watchFechaNacimientoRep = watchRep('fechaNacimiento');
  const [tieneRepresentanteLegal, setTieneRepresentanteLegal] = useState(initialTieneRepresentanteLegal);
  const edad = (() => {
    try { return watchFechaNacimiento ? calculateAge(watchFechaNacimiento) : 0; } catch { return 0; }
  })();
  const esMenor = (() => {
    try { return watchFechaNacimiento ? isMinorOnConsentDate(watchFechaNacimiento) : false; } catch { return false; }
  })();
  const estaRepresentado = esMenor || tieneRepresentanteLegal;

  useEffect(() => {
    if (esMenor && !tieneRepresentanteLegal) setTieneRepresentanteLegal(true);
  }, [esMenor, tieneRepresentanteLegal]);

  useEffect(() => {
    if (!estaRepresentado) resetRep({ ...INITIAL_REPRESENTATIVE });
  }, [estaRepresentado, resetRep]);

  // Register saveStateRef to save values on demand (e.g. on navigation)
  useEffect(() => {
    saveStateRef.current = () => {
      onUpdate({
        datosCliente: getClientValues(),
        datosRepresentante: estaRepresentado ? getRepValues() : INITIAL_REPRESENTATIVE,
        esMenor,
        tieneRepresentanteLegal: estaRepresentado,
      });
    };

    return () => {
      saveStateRef.current = null;
    };
  }, [getClientValues, getRepValues, esMenor, estaRepresentado, onUpdate, saveStateRef]);

  // Expose validation function to parent and sync state
  useEffect(() => {
    triggerValidationRef.current = async () => {
      const clientValid = await triggerClient();
      let repValid = true;

      if (estaRepresentado) {
        repValid = await triggerRep();
      }

      onUpdate({
        datosCliente: getClientValues(),
        datosRepresentante: estaRepresentado ? getRepValues() : INITIAL_REPRESENTATIVE,
        esMenor,
        tieneRepresentanteLegal: estaRepresentado,
      });

      return clientValid && repValid;
    };

    return () => {
      triggerValidationRef.current = null;
    };
  }, [triggerClient, triggerRep, estaRepresentado, esMenor, getClientValues, getRepValues, onUpdate, triggerValidationRef]);

  return (
    <div className="flex-1 flex flex-col justify-between bg-zinc-50/50 select-none p-6 sm:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        
        {/* Step Header */}
        <div className="text-center space-y-1">
          <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-400 font-bold">
            Identificación
          </span>
          <h2 className="font-sans font-extrabold text-2xl text-zinc-950 tracking-tight">
            Datos de la Persona Usuaria
          </h2>
        </div>

        {/* Bento Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Main Identification (Takes 2 cols) */}
          <div className="bento-card bg-white p-6 md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
              <User className="w-4 h-4 text-zinc-400" />
              <span className="font-sans font-bold text-xs text-zinc-900 uppercase tracking-wider">
                Información Personal
              </span>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="font-sans font-semibold text-zinc-500 text-[10px] uppercase tracking-wider block">
                  Nombre y dos apellidos
                </label>
                <input
                  type="text"
                  {...regClient('nombreYApellidos')}
                  placeholder="ej. Juan Pérez García"
                  className="w-full"
                />
                {clientErrors.nombreYApellidos && (
                  <span className="text-red-600 font-sans text-[10px] block mt-1 font-medium">
                    {clientErrors.nombreYApellidos.message}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-sans font-semibold text-zinc-500 text-[10px] uppercase tracking-wider block">
                    DNI / NIE / Pasaporte
                  </label>
                  <input
                    type="text"
                    {...regClient('dni')}
                    placeholder="ej. 12345678Z"
                    className="w-full font-mono uppercase"
                  />
                  {clientErrors.dni && (
                    <span className="text-red-600 font-sans text-[10px] block mt-1 font-medium">
                      {clientErrors.dni.message}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-sans font-semibold text-zinc-500 text-[10px] uppercase tracking-wider block">
                    Fecha Nacimiento
                  </label>
                  <input
                    type="hidden"
                    {...regClient('fechaNacimiento')}
                  />
                  <DatePicker
                    value={watchFechaNacimiento || ''}
                    onChange={(val) => setClientValue('fechaNacimiento', val, { shouldValidate: true, shouldDirty: true })}
                    error={clientErrors.fechaNacimiento?.message}
                  />
                  {clientErrors.fechaNacimiento && (
                    <span className="text-red-600 font-sans text-[10px] block mt-1 font-medium">
                      {clientErrors.fechaNacimiento.message}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Contact & Age Status (Takes 1 col, beautiful vertical card) */}
          <div className="bento-card bg-white p-6 md:col-span-1 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
                <FileText className="w-4 h-4 text-zinc-400" />
                <span className="font-sans font-bold text-xs text-zinc-900 uppercase tracking-wider">
                  Contacto & Estado
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-sans font-semibold text-zinc-500 text-[10px] uppercase tracking-wider block">
                  Teléfono de contacto
                </label>
                <input
                  type="tel"
                  {...regClient('telefono')}
                  placeholder="ej. 600123456"
                  className="w-full font-mono"
                />
                {clientErrors.telefono && (
                  <span className="text-red-600 font-sans text-[10px] block mt-1 font-medium">
                    {clientErrors.telefono.message}
                  </span>
                )}
              </div>
            </div>

            {/* Toggle Menor / Incapacitado */}
            <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="font-sans font-bold text-xs text-zinc-900 uppercase tracking-tight">Menor / Tutor</span>
                <span className="text-[10px] text-zinc-400 font-sans mt-0.5 leading-normal">
                  Obligatorio para menores de 18 años.
                </span>
              </div>
              <button
                type="button"
                disabled={esMenor}
                aria-label="Representante legal"
                onClick={() => {
                  if (esMenor) return;
                  const next = !tieneRepresentanteLegal;
                  setTieneRepresentanteLegal(next);
                  if (!next) resetRep({ ...INITIAL_REPRESENTATIVE });
                }}
                className="cursor-pointer text-zinc-700 hover:text-zinc-950 transition-colors disabled:cursor-not-allowed"
              >
                {estaRepresentado ? (
                  <ToggleRight className="w-10 h-10 text-zinc-900" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-zinc-300" />
                )}
              </button>
            </div>
          </div>

          {/* Card 3: Address (Takes all 3 cols or fits beautifully) */}
          <div className="bento-card bg-white p-6 md:col-span-3 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="font-sans font-semibold text-zinc-500 text-[10px] uppercase tracking-wider block">
                  Domicilio completo
                </label>
                <input
                  type="text"
                  {...regClient('domicilio')}
                  placeholder="ej. Av. Constitución 23, 4ºB"
                  className="w-full"
                />
                {clientErrors.domicilio && (
                  <span className="text-red-600 font-sans text-[10px] block mt-1 font-medium">
                    {clientErrors.domicilio.message}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 md:col-span-1">
                <div className="col-span-1 space-y-1">
                  <label className="font-sans font-semibold text-zinc-500 text-[10px] uppercase tracking-wider block">
                    CP
                  </label>
                  <input
                    type="text"
                    {...regClient('cp')}
                    placeholder="39010"
                    className="w-full font-mono"
                  />
                  {clientErrors.cp && (
                    <span className="text-red-600 font-sans text-[10px] block mt-1 font-medium">
                      {clientErrors.cp.message}
                    </span>
                  )}
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="font-sans font-semibold text-zinc-500 text-[10px] uppercase tracking-wider block">
                    Localidad
                  </label>
                  <input
                    type="text"
                    {...regClient('localidad')}
                    placeholder="Santander"
                    className="w-full"
                  />
                  {clientErrors.localidad && (
                    <span className="text-red-600 font-sans text-[10px] block mt-1 font-medium">
                      {clientErrors.localidad.message}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Representative legal section (Styled in a beautiful unified Bento container) */}
        {estaRepresentado && (
          <div className="bento-card bg-zinc-900 text-white p-6 space-y-4 animate-fadeIn">
            <div className="flex items-start gap-2.5 border-b border-zinc-800 pb-3 mb-2">
              <ShieldAlert className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-sans font-bold text-xs text-white uppercase tracking-wider block">
                  Representante Legal (Obligatorio)
                </span>
                <span className="text-[10px] text-zinc-400 font-sans mt-0.5 block">
                  Por favor, declare la autorización de los tutores legales reglamentarios.
                </span>
              </div>
            </div>

            {esMenor && (
              <div className="flex gap-2.5 p-3.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 rounded-xl text-[11px] items-center leading-normal">
                <AlertTriangle className="w-4 h-4 shrink-0 text-yellow-400" />
                <span>
                  El usuario es menor de edad ({edad} años). Se requiere tutor legal.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="font-sans font-semibold text-zinc-400 text-[10px] uppercase tracking-wider block">
                  Nombre y apellidos del tutor
                </label>
                <input
                  type="text"
                  {...regRep('nombreYApellidos')}
                  placeholder="ej. María García López"
                  className="w-full !bg-zinc-800 !text-white !border-zinc-700 focus:!border-white"
                />
                {repErrors.nombreYApellidos && (
                  <span className="text-red-400 font-sans text-[10px] block mt-1 font-medium">
                    {repErrors.nombreYApellidos.message}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-2">
                <div className="space-y-1">
                  <label className="font-sans font-semibold text-zinc-400 text-[10px] uppercase tracking-wider block">
                    DNI / NIE del tutor
                  </label>
                  <input
                    type="text"
                    {...regRep('dni')}
                    placeholder="ej. 87654321Z"
                    className="w-full font-mono uppercase !bg-zinc-800 !text-white !border-zinc-700 focus:!border-white"
                  />
                  {repErrors.dni && (
                    <span className="text-red-400 font-sans text-[10px] block mt-1 font-medium">
                      {repErrors.dni.message}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-sans font-semibold text-zinc-400 text-[10px] uppercase tracking-wider block">
                    Fecha Nacimiento Tutor
                  </label>
                  <input
                    type="hidden"
                    {...regRep('fechaNacimiento')}
                  />
                  <DatePicker
                    value={watchFechaNacimientoRep || ''}
                    onChange={(val) => setRepValue('fechaNacimiento', val, { shouldValidate: true, shouldDirty: true })}
                    error={repErrors.fechaNacimiento?.message}
                    dark={true}
                  />
                  {repErrors.fechaNacimiento && (
                    <span className="text-red-400 font-sans text-[10px] block mt-1 font-medium">
                      {repErrors.fechaNacimiento.message}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-2">
                <div className="space-y-1">
                  <label className="font-sans font-semibold text-zinc-400 text-[10px] uppercase tracking-wider block">
                    Parentesco
                  </label>
                  <select
                    {...regRep('parentesco')}
                    className="w-full !bg-zinc-800 !text-white !border-zinc-700 focus:!border-white"
                  >
                    <option value="" className="bg-zinc-800 text-white">Seleccione...</option>
                    <option value="PADRE" className="bg-zinc-800 text-white">PADRE</option>
                    <option value="MADRE" className="bg-zinc-800 text-white">MADRE</option>
                    <option value="TUTOR_LEGAL" className="bg-zinc-800 text-white">TUTOR/A LEGAL</option>
                  </select>
                  {repErrors.parentesco && (
                    <span className="text-red-400 font-sans text-[10px] block mt-1 font-medium">
                      {repErrors.parentesco.message}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-sans font-semibold text-zinc-400 text-[10px] uppercase tracking-wider block">
                    Acredita relación mediante
                  </label>
                  <select
                    {...regRep('acreditaMediante')}
                    className="w-full !bg-zinc-800 !text-white !border-zinc-700 focus:!border-white"
                  >
                    <option value="" className="bg-zinc-800 text-white">Seleccione...</option>
                    <option value="LIBRO_DE_FAMILIA" className="bg-zinc-800 text-white">LIBRO DE FAMILIA</option>
                    <option value="DNI_AMBOS" className="bg-zinc-800 text-white">DNI DE AMBOS</option>
                    <option value="SENTENCIA_TUTELA" className="bg-zinc-800 text-white">SENTENCIA JUDICIAL</option>
                  </select>
                  {repErrors.acreditaMediante && (
                    <span className="text-red-400 font-sans text-[10px] block mt-1 font-medium">
                      {repErrors.acreditaMediante.message}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="font-sans font-semibold text-zinc-400 text-[10px] uppercase tracking-wider block">
                  Domicilio del tutor
                </label>
                <input
                  type="text"
                  {...regRep('domicilio')}
                  placeholder="ej. Calle Vargas 45, Santander"
                  className="w-full !bg-zinc-800 !text-white !border-zinc-700 focus:!border-white"
                />
                {repErrors.domicilio && (
                  <span className="text-red-400 font-sans text-[10px] block mt-1 font-medium">
                    {repErrors.domicilio.message}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 md:col-span-2">
                <div className="col-span-1 space-y-1">
                  <label className="font-sans font-semibold text-zinc-400 text-[10px] uppercase tracking-wider block">
                    CP
                  </label>
                  <input
                    type="text"
                    {...regRep('cp')}
                    placeholder="39010"
                    className="w-full font-mono !bg-zinc-800 !text-white !border-zinc-700 focus:!border-white"
                  />
                  {repErrors.cp && (
                    <span className="text-red-400 font-sans text-[10px] block mt-1 font-medium">
                      {repErrors.cp.message}
                    </span>
                  )}
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="font-sans font-semibold text-zinc-400 text-[10px] uppercase tracking-wider block">
                    Localidad
                  </label>
                  <input
                    type="text"
                    {...regRep('localidad')}
                    placeholder="Santander"
                    className="w-full !bg-zinc-800 !text-white !border-zinc-700 focus:!border-white"
                  />
                  {repErrors.localidad && (
                    <span className="text-red-400 font-sans text-[10px] block mt-1 font-medium">
                      {repErrors.localidad.message}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="font-sans font-semibold text-zinc-400 text-[10px] uppercase tracking-wider block">
                  Teléfono tutor
                </label>
                <input
                  type="tel"
                  {...regRep('telefono')}
                  placeholder="ej. 600987654"
                  className="w-full font-mono !bg-zinc-800 !text-white !border-zinc-700 focus:!border-white"
                />
                {repErrors.telefono && (
                  <span className="text-red-400 font-sans text-[10px] block mt-1 font-medium">
                    {repErrors.telefono.message}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
