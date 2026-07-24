/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/src/types/supabase';
import { AlertCircle, Download, Eye, FileSignature, FileText, Loader2, Search } from 'lucide-react';
import SensitiveText from '@/src/components/SensitiveText';
import DatePicker from '@/src/components/DatePicker';

type Consent = Database['public']['Tables']['consents']['Row'];
type Artist = Database['public']['Tables']['artists']['Row'];

type ConsentWithStudio = Consent & { studios: { trade_name: string } | null };
type ArtistConsentsFilter = 'all' | 'pending_signature';

interface ArtistConsentsProps {
  artistId: string;
  artist?: Artist | null;
  statusFilter: ArtistConsentsFilter;
  onStatusFilterChange: (nextFilter: ArtistConsentsFilter) => void;
  onPreviewConsent: (consent: ConsentWithStudio) => void;
  onInterveneConsent: (consent: ConsentWithStudio) => void;
}

export interface ArtistConsentsHandle {
  loadConsents: () => void;
}

function isPendingSignatureStatus(status: Consent['status']) {
  return status === 'pending_technique' || status === 'pending_artist' || status === 'upload_error';
}

function getConsentStatusLabel(status: Consent['status']) {
  switch (status) {
    case 'signed':
      return 'Firmado';
    case 'pending_technique':
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

const ArtistConsents = forwardRef<ArtistConsentsHandle, ArtistConsentsProps>(
  function ArtistConsents(
    { artistId, artist, statusFilter, onStatusFilterChange, onPreviewConsent, onInterveneConsent },
    ref
  ) {
    const [consents, setConsents] = useState<ConsentWithStudio[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const supabase = useMemo(() => createClient(), []);

    const loadConsents = useCallback(async () => {
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
    }, [artistId, supabase]);

    useImperativeHandle(ref, () => ({ loadConsents }), [loadConsents]);

    // react-doctor-disable-next-line effect-needs-cleanup -- Supabase channel is explicitly unsubscribed below.
    useEffect(() => {
      loadConsents();

      const channelName = `artist-consents-realtime-${artistId}`;
      const existingChannel = supabase
        .getChannels()
        .find((ch: any) => ch.topic === `realtime:${channelName}`);
      if (existingChannel) {
        supabase.removeChannel(existingChannel);
      }

      const channel = supabase
        .channel(channelName)
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
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            console.warn('[Realtime ArtistConsents] canal en estado', status);
          }
        });

      return () => {
        void channel.unsubscribe();
      };
    }, [artistId, loadConsents, supabase]);

    const downloadPdf = async (consent: ConsentWithStudio) => {
      if (!consent.final_file_id) {
        setError('Este consentimiento no tiene un PDF final disponible');
        return;
      }

      const { data, error } = await supabase
        .from('consent_files')
        .select('storage_path')
        .eq('id', consent.final_file_id)
        .eq('document_kind', 'final')
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

    const pending = consents.filter((c) => isPendingSignatureStatus(c.status)).length;
    const filtered = consents.filter((c) => {
      const normalizedFilter = filter.toLowerCase();
      const createdAt = new Date(c.created_at);
      const matchesText = (
        (c.client_full_name ?? '').toLowerCase().includes(normalizedFilter) ||
        (c.client_dni ?? '').toLowerCase().includes(normalizedFilter) ||
        (c.status ?? '').toLowerCase().includes(normalizedFilter) ||
        getConsentStatusLabel(c.status).toLowerCase().includes(normalizedFilter)
      );
      const matchesFrom = fromDate ? createdAt >= new Date(`${fromDate}T00:00:00`) : true;
      const matchesTo = toDate ? createdAt <= new Date(`${toDate}T23:59:59.999`) : true;
      const matchesStatus = statusFilter === 'pending_signature' ? isPendingSignatureStatus(c.status) : true;

      return matchesText && matchesFrom && matchesTo && matchesStatus;
    });

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h2 className="font-sans text-2xl font-black tracking-tight">Mis consentimientos</h2>
            {statusFilter === 'pending_signature' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800">
                  Mostrando pendientes de firma
                </span>
                <button
                  type="button"
                  onClick={() => onStatusFilterChange('all')}
                  className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-bold text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 cursor-pointer"
                >
                  Ver todos
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            {pending > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs font-bold">
                <AlertCircle className="w-4 h-4" />
                {pending} pendiente{pending !== 1 ? 's' : ''}
              </div>
            )}
            <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(0,320px)_160px_160px]">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Buscar cliente, DNI o estado"
                  className="w-full rounded-xl border border-zinc-200 !py-2.5 !pl-9 !pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
                />
              </div>

              <DatePicker
                value={fromDate}
                onChange={setFromDate}
                placeholder="Fecha desde"
              />

              <DatePicker
                value={toDate}
                onChange={setToDate}
                placeholder="Fecha hasta"
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
              <table className="w-full min-w-[860px] text-left text-sm">
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
                                : isPendingSignatureStatus(consent.status)
                                ? 'bg-amber-50 text-amber-700 border-amber-100'
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
                          {isPendingSignatureStatus(consent.status) ? (
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => onPreviewConsent(consent)}
                                className="inline-flex items-center gap-2 rounded-xl border border-purple-100 bg-purple-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-purple-600 transition-all hover:bg-purple-100 cursor-pointer"
                                title="Ver datos del cliente"
                                aria-label="Ver datos del cliente"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Ver
                              </button>

                              <button
                                type="button"
                                onClick={() => onInterveneConsent(consent)}
                                className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-red-600 transition-all hover:bg-red-100 cursor-pointer"
                                title="Firmar intervención y consentimiento"
                              >
                                <FileSignature className="w-3.5 h-3.5" />
                                Firmar
                              </button>
                            </div>
                          ) : consent.status === 'signed' && consent.final_file_id ? (
                            <button
                              type="button"
                              onClick={() => downloadPdf(consent)}
                              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-700 transition-all hover:bg-zinc-100 cursor-pointer"
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
              <div className="text-center py-12 text-zinc-400 text-xs font-medium">
                {statusFilter === 'pending_signature'
                  ? 'No hay consentimientos pendientes de firma con los filtros actuales.'
                  : 'No tienes consentimientos registrados.'}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

export default ArtistConsents;
