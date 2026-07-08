/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/src/types/supabase';
import { Download, FileCheck2, Loader2, Search } from 'lucide-react';
import SensitiveText from '@/src/components/SensitiveText';
import DatePicker from '@/src/components/DatePicker';

type Consent = Database['public']['Tables']['consents']['Row'];

type ConsentWithArtist = Consent & { artists: { full_name: string } | null };

interface ConsentsManagerProps {
  studioId: string;
}

function getConsentStatusLabel(status: Consent['status']) {
  switch (status) {
    case 'signed':
      return 'Completado';
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

export default function ConsentsManager({ studioId }: ConsentsManagerProps) {
  const [consents, setConsents] = useState<ConsentWithArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const supabase = createClient();

  const loadConsents = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('consents')
      .select('*, artists(full_name)')
      .eq('studio_id', studioId)
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
      .channel('admin-consents-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consents',
          filter: `studio_id=eq.${studioId}`,
        },
        () => {
          loadConsents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studioId]);

  const downloadPdf = async (consent: ConsentWithArtist) => {
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

  const filtered = consents.filter((c) => {
    const createdAt = new Date(c.created_at);
    const matchesText =
      c.client_full_name.toLowerCase().includes(filter.toLowerCase()) ||
      c.client_dni.toLowerCase().includes(filter.toLowerCase()) ||
      c.artists?.full_name.toLowerCase().includes(filter.toLowerCase());
    const matchesFrom = fromDate ? createdAt >= new Date(`${fromDate}T00:00:00`) : true;
    const matchesTo = toDate ? createdAt <= new Date(`${toDate}T23:59:59`) : true;

    return matchesText && matchesFrom && matchesTo;
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-sans text-2xl font-black tracking-tight">Consentimientos</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-xs p-3 rounded-xl">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
        </div>
      ) : (
        <div className="rounded-[28px] border border-purple-200 bg-white p-3 shadow-sm">
          <div className="grid gap-3 border-b border-zinc-100 p-3 md:grid-cols-[1.3fr_1fr_1fr] items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filtros de búsqueda"
                className="w-full rounded-xl border border-zinc-200 !py-2.5 !pl-9 !pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
              />
            </div>

            <div>
              <DatePicker
                value={fromDate}
                onChange={setFromDate}
                placeholder="Fecha desde"
              />
            </div>

            <div>
              <DatePicker
                value={toDate}
                onChange={setToDate}
                placeholder="Fecha hasta"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-100">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">Cliente</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">Estado</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">Tatuador</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">Fecha</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">DNI</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500 text-right">Fichero</th>
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
                  <td className="px-4 py-3 text-zinc-500">
                    <SensitiveText>{consent.artists?.full_name || '—'}</SensitiveText>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    <SensitiveText>{new Date(consent.created_at).toLocaleString('es-ES')}</SensitiveText>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 font-mono text-xs">
                    <SensitiveText>{consent.client_dni}</SensitiveText>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <SensitiveText>
                      {consent.status === 'signed' ? (
                        <button
                          type="button"
                          onClick={() => downloadPdf(consent)}
                          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-700 transition-all hover:bg-zinc-100"
                          title="Ver o descargar PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Ver / descargar
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-amber-700">
                          <FileCheck2 className="w-3.5 h-3.5" />
                          Incompleto
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
            <div className="text-center py-12 text-zinc-400 text-xs font-medium">No hay consentimientos.</div>
          )}
        </div>
      )}
    </div>
  );
}
