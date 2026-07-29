/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useEffect, useState } from 'react';
import SignaturePad from '../components/SignaturePad';
import { LEGAL_SECTIONS } from '../lib/legalTexts';
import type { Cliente, RepresentanteLegal } from '../types';
import { ShieldCheck, Check, CheckCircle2 } from 'lucide-react';
import SensitiveText from '../components/SensitiveText';

interface Step6SignatureClientProps {
  datosCliente: Cliente;
  datosRepresentante: RepresentanteLegal;
  tieneRepresentanteLegal: boolean;
  firmaCliente: string;
  onUpdate: (firmaCliente: string) => void;
  triggerValidationRef: React.MutableRefHandle<(() => Promise<boolean>) | null>;
  onConfirmSubmit?: () => void;
}

export default function Step6SignatureClient({
  datosCliente,
  datosRepresentante,
  tieneRepresentanteLegal,
  firmaCliente,
  onUpdate,
  triggerValidationRef,
  onConfirmSubmit,
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

  const estaRepresentado = tieneRepresentanteLegal;
  const nombreFirmante = estaRepresentado
    ? datosRepresentante.nombreYApellidos || 'TUTOR LEGAL NO DEFINIDO'
    : datosCliente.nombreYApellidos || 'CLIENTE NO DEFINIDO';

  const dniFirmante = estaRepresentado
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

          {estaRepresentado && (
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
              <SensitiveText className="font-bold text-zinc-900 uppercase">{nombreFirmante}</SensitiveText>
            </div>
            <div>
              DNI/NIE:{' '}
              <SensitiveText className="font-bold text-zinc-900 uppercase font-mono">{dniFirmante}</SensitiveText>
            </div>
          </div>
        </div>

        {/* Signature Box */}
        <div className="flex-1 flex flex-col justify-center">
          <SignaturePad
            id="client-signature"
            placeholderText={
              estaRepresentado
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
            onConfirmSubmit={onConfirmSubmit}
          />
        </div>
      </div>
    </div>
  );
}
