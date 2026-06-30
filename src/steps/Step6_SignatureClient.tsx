/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import SignaturePad from '../components/SignaturePad';
import { LEGAL_SECTIONS } from '../lib/legalTexts';
import { Cliente, RepresentanteLegal } from '../types';
import { ShieldCheck, Check, CheckCircle2 } from 'lucide-react';

interface Step6SignatureClientProps {
  datosCliente: Cliente;
  datosRepresentante: RepresentanteLegal;
  esMenor: boolean;
  firmaCliente: string;
  onUpdate: (firmaCliente: string) => void;
  triggerValidationRef: React.MutableRefHandle<(() => Promise<boolean>) | null>;
}

export default function Step6SignatureClient({
  datosCliente,
  datosRepresentante,
  esMenor,
  firmaCliente,
  onUpdate,
  triggerValidationRef,
}: Step6SignatureClientProps) {
  const [signature, setSignature] = useState(firmaCliente);

  useEffect(() => {
    triggerValidationRef.current = async () => {
      onUpdate(signature);
      return !!signature; // Valid if signature is not empty
    };

    return () => {
      triggerValidationRef.current = null;
    };
  }, [signature, onUpdate, triggerValidationRef]);

  const nombreFirmante = esMenor
    ? datosRepresentante.nombreYApellidos || 'TUTOR LEGAL NO DEFINIDO'
    : datosCliente.nombreYApellidos || 'CLIENTE NO DEFINIDO';

  const dniFirmante = esMenor
    ? datosRepresentante.dni || 'DNI TUTOR NO DEFINIDO'
    : datosCliente.dni || 'DNI CLIENTE NO DEFINIDO';

  return (
    <div className="flex-1 flex flex-col justify-between bg-zinc-50/50 select-none p-6 sm:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        
        {/* Step Header */}
        <div className="text-center space-y-1">
          <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-400 font-bold">
            Autorización
          </span>
          <h2 className="font-sans font-extrabold text-2xl text-zinc-950 tracking-tight">
            Firma de la Persona Usuaria
          </h2>
          <p className="font-sans text-xs text-zinc-500">
            Firma digitalmente la conformidad legal del consentimiento informado para su registro seguro
          </p>
        </div>

        {/* Legal Conformity text (Elegant Bento Card) */}
        <div className="bento-card bg-white p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
            <ShieldCheck className="w-4 h-4 text-zinc-950" />
            <span className="font-sans font-bold text-xs text-zinc-900 uppercase tracking-wider">
              Declaración Expresa de Voluntad
            </span>
          </div>
          
          <p className="font-sans text-xs text-justify leading-relaxed text-zinc-500">
            {LEGAL_SECTIONS.conformidad.texto}
          </p>

          {esMenor && (
            <div className="pt-3 border-t border-zinc-100 mt-3">
              <span className="font-sans font-bold text-zinc-900 text-[10px] uppercase tracking-wider block">
                Autorización de Representación Integral
              </span>
              <p className="font-sans text-[11px] text-zinc-500 text-justify leading-relaxed mt-1">
                {LEGAL_SECTIONS.menores.texto}
              </p>
            </div>
          )}

          {/* Firmante Meta Info */}
          <div className="pt-3 border-t border-zinc-100 mt-3 flex flex-wrap justify-between items-center text-xs font-sans text-zinc-500 gap-y-2">
            <div>
              Firmante:{' '}
              <span className="font-bold text-zinc-900 uppercase">{nombreFirmante}</span>
            </div>
            <div>
              DNI/NIE:{' '}
              <span className="font-bold text-zinc-900 uppercase font-mono">{dniFirmante}</span>
            </div>
          </div>
        </div>

        {/* Signature Box */}
        <div className="flex-1 flex flex-col justify-center">
          <SignaturePad
            id="client-signature"
            placeholderText={
              esMenor
                ? 'Firma del Representante Legal (Padre/Madre/Tutor)'
                : 'Firma de la Persona Usuaria (Cliente)'
            }
            initialDataUrl={firmaCliente}
            onSave={(dataUrl) => {
              setSignature(dataUrl);
              onUpdate(dataUrl);
            }}
            onClear={() => {
              setSignature('');
              onUpdate('');
            }}
          />
        </div>

        {/* Success status message */}
        {signature && (
          <div className="flex items-center justify-center gap-2 text-emerald-800 font-sans text-xs font-semibold bg-emerald-50 p-3.5 border border-emerald-200 rounded-xl animate-fadeIn shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Firma del cliente registrada y autenticada correctamente</span>
          </div>
        )}
      </div>
    </div>
  );
}
