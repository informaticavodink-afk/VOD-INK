/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import SignaturePad from '../components/SignaturePad';
import { Aplicador } from '../types';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

interface Step7SignatureArtistProps {
  artistaSeleccionado: Aplicador | null;
  firmaAplicador: string;
  onUpdate: (firmaAplicador: string) => void;
  triggerValidationRef: React.MutableRefHandle<(() => Promise<boolean>) | null>;
}

export default function Step7SignatureArtist({
  artistaSeleccionado,
  firmaAplicador,
  onUpdate,
  triggerValidationRef,
}: Step7SignatureArtistProps) {
  const [signature, setSignature] = useState(firmaAplicador);

  useEffect(() => {
    triggerValidationRef.current = async () => {
      onUpdate(signature);
      return !!signature; // Valid if signature is not empty
    };

    return () => {
      triggerValidationRef.current = null;
    };
  }, [signature, onUpdate, triggerValidationRef]);

  const nombreArtista = artistaSeleccionado?.nombreYApellidos || 'TATUADOR NO SELECCIONADO';
  const cargoArtista = artistaSeleccionado?.titulacion || 'TÉCNICO APLICADOR';

  return (
    <div className="flex-1 flex flex-col justify-between bg-zinc-50/50 select-none p-6 sm:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        
        {/* Step Header */}
        <div className="text-center space-y-1">
          <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-400 font-bold">
            Certificación
          </span>
          <h2 className="font-sans font-extrabold text-2xl text-zinc-950 tracking-tight">
            Firma del Profesional
          </h2>
          <p className="font-sans text-xs text-zinc-500">
            Firma oficial del técnico homologado para certificar el cumplimiento estricto del protocolo higiénico-sanitario
          </p>
        </div>

        {/* Legal Conformity text (Elegant Bento Card) */}
        <div className="bento-card bg-white p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
            <ShieldCheck className="w-4 h-4 text-zinc-400" />
            <span className="font-sans font-bold text-xs text-zinc-900 uppercase tracking-wider">
              Declaración de Responsabilidad Sanitaria
            </span>
          </div>
          
          <p className="font-sans text-xs text-justify leading-relaxed text-zinc-500">
            D./Dña. <strong className="text-zinc-950 font-bold">{nombreArtista}</strong>, en calidad de técnico aplicador del centro de arte corporal <strong className="text-zinc-950">VOD INK</strong>, certifica bajo su estricta responsabilidad que se han cumplido de forma escrupulosa las medidas higiénicas reguladas por el Decreto 72/2006 de Cantabria.
          </p>
          
          <p className="font-sans text-[11px] text-justify leading-relaxed text-zinc-400">
            Confirma haber verificado fehacientemente la identidad de la persona usuaria (y de su tutor legal de corresponder), así como el desembalaje de boquillas y agujas estériles desechables de un solo uso en su presencia directa.
          </p>

          {/* Profesional Meta Info */}
          <div className="pt-3 border-t border-zinc-100 mt-3 flex flex-wrap justify-between items-center text-xs font-sans text-zinc-500 gap-y-2">
            <div>
              Profesional: <span className="font-bold text-zinc-900 uppercase">{nombreArtista}</span>
            </div>
            <div>
              Registro: <span className="font-bold text-zinc-900 uppercase">{cargoArtista}</span>
            </div>
          </div>
        </div>

        {/* Signature Box */}
        <div className="flex-1 flex flex-col justify-center">
          <SignaturePad
            id="artist-signature"
            placeholderText={`Firma del Aplicador: ${nombreArtista}`}
            initialDataUrl={firmaAplicador}
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
            <span>Certificación profesional firmada y resguardada con éxito</span>
          </div>
        )}
      </div>
    </div>
  );
}
