/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/src/types/supabase';
import { AlertCircle, Download, FileSignature, Loader2, Search, X, Check } from 'lucide-react';
import SensitiveText from '@/src/components/SensitiveText';
import SignaturePad from '../SignaturePad';

type Consent = Database['public']['Tables']['consents']['Row'];
type Artist = Database['public']['Tables']['artists']['Row'];

type ConsentWithStudio = Consent & { studios: { trade_name: string } | null };

interface ArtistConsentsProps {
  artistId: string;
  artist?: Artist | null;
}

function getConsentStatusLabel(status: Consent['status']) {
  switch (status) {
    case 'signed':
      return 'Firmado';
    case 'pending_artist':
      return 'Pendiente de firma';
    case 'upload_error':
      return 'Error de archivo';
    case 'cancelled':
      return 'Cancelado';
    default:
      return 'Borrador';
  }
}

export default function ArtistConsents({ artistId, artist }: ArtistConsentsProps) {
  const [consents, setConsents] = useState<ConsentWithStudio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  // States for signing modal
  const [signingConsent, setSigningConsent] = useState<ConsentWithStudio | null>(null);
  const [artistSignature, setArtistSignature] = useState<string>('');
  const [isSubmittingSignature, setIsSubmittingSignature] = useState<boolean>(false);

  const supabase = createClient();

  const loadConsents = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('consents')
      .select('*, studios(trade_name)')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setConsents(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadConsents();

    const channel = supabase
      .channel(`artist-consents-realtime-${artistId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consents',
          filter: `artist_id=eq.${artistId}`,
        },
        () => {
          loadConsents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [artistId]);

  const downloadPdf = async (consent: ConsentWithStudio) => {
    const { data, error } = await supabase
      .from('consent_files')
      .select('storage_path')
      .eq('consent_id', consent.id)
      .single();

    if (error || !data) {
      setError('No se encontró el archivo PDF');
      return;
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from('consent-pdfs')
      .createSignedUrl(data.storage_path, 60);

    if (signedError || !signedData) {
      setError('Error al generar enlace de descarga');
      return;
    }

    window.open(signedData.signedUrl, '_blank');
  };

  const pending = consents.filter((c) => c.status === 'pending_artist').length;
  const filtered = consents.filter((c) => {
    const normalizedFilter = filter.toLowerCase();
    return (
      c.client_full_name.toLowerCase().includes(normalizedFilter) ||
      c.client_dni.toLowerCase().includes(normalizedFilter) ||
      c.status.toLowerCase().includes(normalizedFilter)
    );
  });

  const startSigning = (consent: ConsentWithStudio) => {
    setSigningConsent(consent);
    setArtistSignature('');
    setError(null);
  };

  const handleConfirmSignature = async () => {
    if (!signingConsent || !artistSignature) return;
    setIsSubmittingSignature(true);
    setError(null);

    try {
      const response = await fetch(`/api/consents/${signingConsent.id}/sign-artist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: artistSignature }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error al enviar la firma' }));
        throw new Error(errorData.error || 'Error en el servidor');
      }

      setSigningConsent(null);
      setArtistSignature('');
      await loadConsents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la firma');
    } finally {
      setIsSubmittingSignature(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-sans text-2xl font-black tracking-tight">Mis consentimientos</h2>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          {pending > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs font-bold">
              <AlertCircle className="w-4 h-4" />
              {pending} pendiente{pending !== 1 ? 's' : ''}
            </div>
          )}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Buscar cliente, DNI o estado"
              className="w-full rounded-xl border border-zinc-200 !py-2.5 !pl-9 !pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-xs p-3 rounded-xl">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
        </div>
      ) : (
        <div className="rounded-[28px] border border-amber-200 bg-white p-3 shadow-sm">
          <div className="overflow-x-auto rounded-2xl border border-zinc-100">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">Cliente</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">Estado</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">Fecha</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">DNI</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500 text-right">Firmar / PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((consent) => (
                <tr key={consent.id} className="hover:bg-zinc-50/50">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    <SensitiveText>{consent.client_full_name}</SensitiveText>
                  </td>
                  <td className="px-4 py-3">
                    <SensitiveText>
                      <span
                        className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                          consent.status === 'signed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : consent.status === 'upload_error'
                            ? 'bg-red-50 text-red-700 border-red-100'
                            : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                        }`}
                      >
                        {getConsentStatusLabel(consent.status)}
                      </span>
                    </SensitiveText>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    <SensitiveText>{new Date(consent.created_at).toLocaleString('es-ES')}</SensitiveText>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 font-mono text-xs">
                    <SensitiveText>{consent.client_dni}</SensitiveText>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <SensitiveText>
                      {consent.status === 'pending_artist' ? (
                        <button
                          type="button"
                          onClick={() => startSigning(consent)}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-red-600 transition-all hover:bg-red-100"
                          title="Firmar consentimiento"
                        >
                          <FileSignature className="w-3.5 h-3.5" />
                          Firmar
                        </button>
                      ) : consent.status === 'signed' ? (
                        <button
                          type="button"
                          onClick={() => downloadPdf(consent)}
                          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-700 transition-all hover:bg-zinc-100"
                          title="Descargar PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Descargar
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                          Sin fichero
                        </span>
                      )}
                    </SensitiveText>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-zinc-400 text-xs font-medium">No tienes consentimientos registrados.</div>
          )}
        </div>
      )}

      {/* Signature Modal */}
      {signingConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-[32px] p-6 max-w-lg w-full border border-zinc-100 shadow-2xl space-y-5 relative">
            <button
              type="button"
              onClick={() => {
                setSigningConsent(null);
                setArtistSignature('');
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-400 font-bold">
                Certificación Higiénico-Sanitaria
              </span>
              <h3 className="font-sans font-extrabold text-xl text-zinc-950 tracking-tight">
                Firma del Profesional
              </h3>
              <p className="font-sans text-xs text-zinc-500">
                Firma para el consentimiento de <strong className="text-zinc-800">{signingConsent.client_full_name}</strong>
              </p>
            </div>

            {/* Bento card: Declaración */}
            <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-[11px] text-zinc-500 leading-relaxed text-justify space-y-2">
              <p>
                Yo, <strong className="text-zinc-950 font-bold">{artist?.full_name || 'El Técnico Aplicador'}</strong>, con DNI/NIE <strong className="text-zinc-950 font-semibold">{artist?.dni || 'N/A'}</strong> y cualificación <strong className="text-zinc-950 font-semibold">{artist?.qualification || 'Técnico Homologado'}</strong>, certifica bajo su estricta responsabilidad que se han cumplido de forma escrupulosa las medidas higiénicas reguladas por el Decreto 72/2006 de Cantabria.
              </p>
              <p className="text-[10px] text-zinc-400">
                Confirma haber verificado fehacientemente la identidad de la persona usuaria y el desembalaje de boquillas y agujas estériles desechables en su presencia directa.
              </p>
            </div>

            {/* Signature Pad */}
            <div className="h-[200px] flex flex-col justify-center">
              <SignaturePad
                id="artist-signature-pad"
                placeholderText={`Firma del Tatuador: ${artist?.full_name || 'Aplicador'}`}
                initialDataUrl={artistSignature}
                onSave={(dataUrl) => setArtistSignature(dataUrl)}
                onClear={() => setArtistSignature('')}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setSigningConsent(null);
                  setArtistSignature('');
                }}
                className="flex-1 py-3 text-xs font-bold text-zinc-700 bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200 rounded-xl transition-all cursor-pointer border border-zinc-200/50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!artistSignature || isSubmittingSignature}
                onClick={handleConfirmSignature}
                className="flex-1 py-3 text-xs font-extrabold uppercase tracking-wider text-white bg-zinc-950 hover:bg-zinc-800 active:bg-zinc-900 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmittingSignature ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-4.5 h-4.5 stroke-[2.5]" />
                    Confirmar Firma
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
